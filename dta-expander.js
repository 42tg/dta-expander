'use strict';

const program = require('commander')
var colors = require('colors');
const fs = require('fs')
program
  .version('0.0.1')
  .arguments('<source> <target>')
  .option('-m, --multiplier','Multiply Payments in XML file with this number, default 100')
  .action((source, target, options) => {
    try{
        fs.lstatSync(source).isFile()
        multiplyXML(source, target, options)
    } catch (e) {
        if(e.code === "ENOENT")
        {
            console.log("Please provide an valid File to parse!")
            return
        }
        console.log("Something went wrong, sorry " + e);
    }
  })
  .parse(process.argv);

  if(!process.argv.slice(2).length){
    program.outputHelp(make_red)
  }

  function make_red(txt){
      return colors.red(txt)
  }
function multiplyXML(source, target, {multiply = 100}){
    const saxStream = require("sax").createStream(true, {})
    const writeStream = require('fs').createWriteStream(target);
    
    let recordCdtTrfTxInf = false
    let recordCtrlSum = false
    let recordNbOfTxs = false
    let CdtTrfTxInf
    let CtrlSum 
    let NbOfTxs

    saxStream.on('opentag', function (node) {
        if(node.name === 'CdtTrfTxInf'){
            recordCdtTrfTxInf = true
            CdtTrfTxInf = `<${node.name}>`
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
        if(recordCdtTrfTxInf) {
            CdtTrfTxInf += `<${node.name}`
            Object.keys(node.attributes).map((key) => {
                CdtTrfTxInf += ` ${key}="${node.attributes[key]}"`
            })
            CdtTrfTxInf += `>`
            return
        }

        if(!node.name) return
        let string = `<${node.name}`
        Object.keys(node.attributes).map((key) => {
            string += ` ${key}="${node.attributes[key]}"`
        })
        string += `>`
        writeStream.write(string)
    })
    saxStream.on('closetag', function (name) {
        if(name === 'CdtTrfTxInf'){
            recordCdtTrfTxInf = false
            CdtTrfTxInf += `</${name}>\n`
            
            for(let i = 0;i < multiply; i++){
                writeStream.write(`${CdtTrfTxInf}`)
            }
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
        writeStream.write(`</${name}>`)
    })
    saxStream.on('text', function(text){
        if(recordCdtTrfTxInf){
            CdtTrfTxInf += `${text}`
            return
        }
        if(recordCtrlSum){
            CtrlSum += `${parseFloat(text)*multiply}` 
            return
        }
        if(recordNbOfTxs){
            NbOfTxs += `${parseFloat(text)*multiply}` 
            return
        }
        writeStream.write(`${text}`)
    })
    saxStream.on('processinginstruction', function(node){
    writeStream.write(`<?${node.name} ${node.body}?>`)
    })
    let count = 0;
    saxStream.on('ready', () => {
    
    })

    saxStream.on('end', () => {
        //console.log(CdtTrfTxInf)
    })

    require('fs').createReadStream(source)
    .pipe(saxStream)

}