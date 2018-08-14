'use strict';
const fs        = require('fs')
const sax       = require('sax')
const program   = require('commander')
const colors    = require('colors');
const perf      = require('execution-time')();
program
  .version('0.0.1')
  .arguments('<source> <target>')
  .option('-m, --multiplier <n>','multiply Payments in XML file with this number, default 100', parseInt)
  .action((source, target, options) => {
    try{
        fs.lstatSync(source).isFile()
        multiplyXML(source, target, options.multiplier)
    } catch (e) {
        if(e.code === "ENOENT")
        {
            console.log("Please provide an valid File to parse!".red)
            return
        }
        console.log("Something went wrong, sorry " + e .red);
    }
  })
  .parse(process.argv);

if(!process.argv.slice(2).length){
    program.outputHelp(make_red)
}

function make_red(txt){
    txt += 'For more informations or a change request, create an issue here: \n'.yellow
    txt += 'https://github.com/42tg/dta-expander'.green
    return colors.red(txt)
}

function multiplyXML(source, target, multiplier = 100){
    perf.start()
    const saxStream = sax.createStream(true, {trim : true})
    const writeStream = fs.createWriteStream(target);
    
    let recordCdtTrfTxInf = false
    let recordCtrlSum = false
    let recordNbOfTxs = false
    let recordRest = false
    let CdtTrfTxInf = ''
    let CtrlSum 
    let NbOfTxs
    let rest = ''

    saxStream.on('opentag', function (node) {
        if(node.name === 'CdtTrfTxInf'){
            recordCdtTrfTxInf = true
            recordRest = false
            CdtTrfTxInf += `<${node.name}>`
            return
        }
        if(node.name === 'CtrlSum'){
            recordCtrlSum = true
            CtrlSum = `<${node.name}>`
            return
        }
        if(node.name === 'NbOfTxs'){
            recordNbOfTxs = true
            NbOfTxs = `<${node.name}>`
            return
        }

        if(!node.name) return
        let string = `<${node.name}`
        Object.keys(node.attributes).map((key) => {
            string += ` ${key}="${node.attributes[key]}"`
        })
        string += `>`

        if(recordCdtTrfTxInf) {
            CdtTrfTxInf += string
            return
        }
        if(recordRest){
            rest += string
            return
        }
        writeStream.write(string)
    })

    saxStream.on('closetag', function (name) {
        if(name === 'CdtTrfTxInf'){
            recordCdtTrfTxInf = false
            recordRest = true;
            CdtTrfTxInf += `</${name}>\n`
            return
        }
        if(name === 'CtrlSum'){
            recordCtrlSum = false
            CtrlSum += `</${name}>`
            writeStream.write(`${CtrlSum}`)
            return
        }
        if(name === 'NbOfTxs'){
            recordNbOfTxs = false
            NbOfTxs += `</${name}>`
            writeStream.write(`${NbOfTxs}`)
            return
        }
        if(recordCdtTrfTxInf){
            CdtTrfTxInf += `</${name}>`
            return
        }
        if(recordRest) {
            rest += `</${name}>`
            return
        }
        writeStream.write(`</${name}>`)
    })
    saxStream.on('text', function(text){
        const saferText = text.replace('&','')
        if(recordCdtTrfTxInf){
            CdtTrfTxInf += `${saferText}`
            return
        }
        if(recordCtrlSum){
            CtrlSum += `${parseFloat(saferText)*multiplier}` 
            return
        }
        if(recordNbOfTxs){
            NbOfTxs += `${parseFloat(saferText)*multiplier}` 
            return
        }
        if(recordRest) {

            rest += saferText.trim()
            return
        }
        writeStream.write(`${saferText}`)
    })

    saxStream.on('processinginstruction', function(node){
        writeStream.write(`<?${node.name} ${node.body}?>`)
    })

    function writeRest(){
        writeStream.write(rest, () => writeStream.end())
    }
    saxStream.on('end', () => {
        function writeCB(index) {
            if (index >= multiplier) {
                writeRest()
                return;
            }
            writeStream.write(CdtTrfTxInf, writeCB.bind(null, index + 1));
        }
        writeStream.write(CdtTrfTxInf, writeCB.bind(null, 1));
    })

    writeStream.on('finish', () => {
        const result = perf.stop()
        console.log(`Finished in ${result.time.toFixed(2)}ms!`.green)
    })

    const readStream = fs.createReadStream(source).pipe(saxStream)
}