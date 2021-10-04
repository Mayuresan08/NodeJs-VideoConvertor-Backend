require('dotenv').config()
const cors=require("cors")
const express= require("express")

//importing path module 
const path=require("path")

//importing fs module
const fs=require("fs")

//importing exec to handle shell operation
const {exec} = require("child_process")

//importing multer module  for uploading files
const multer=require("multer")

//importing express-zip
var zip = require('express-zip');
// //importing body-parser to handle req.body
// const bodyParser= require("body-parser")

const app=express()

app.use(cors())
const mainDir ="public";

const subDir1="public/uploads";
const Dir2="output"
//creating public and folder folder if not created
if(!fs.existsSync(mainDir))
{
    fs.mkdirSync(mainDir);
    fs.mkdirSync(subDir1);
}


app.use(express.urlencoded({
    limit:"50mb",
    parameterLimit: 1000000,
    extended:false}))
app.use(express.json())
app.use(express.static('public'))


//multer-storage
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
})
//multer-filter
var filter= (req,file,cb)=>{
    console.log(file.mimetype.split("/")[1])
    if(file.mimetype.split("/")[1] === "mp4"){
        cb(null,true);
    }else {
        cb(new Error("not a MP4 file"),false);
    }
};


var upload = multer({
    storage:storage,
    fileFilter:filter
});


app.get("/",(req,res,next)=>{
    res.send("Hello World")
})
//send converted format .m3u8 as zip-file
app.post("/convert",upload.single("file"),(req,res)=>{
console.log("in convert",req.file)
if(!fs.existsSync(Dir2)) 
fs.mkdirSync(Dir2)
if(req.file){
    console.log(req.file.path)

    var output = "output.m3u8"
    //excecuting shell operation to convert video
    exec(`ffmpeg -i ${req.file.path}  -f hls output/${output}`, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        else{
            console.log("file is converted",output)
            //adding output.m3u8 along with hls segments to zip-file
            function handler()
            {
                let arr=[{ path : 'output/output.m3u8', name : 'output.m3u8'}]
                for (i=0;i<30;i++)
                {
                    let path=`output/output${i}.ts`
                if(fs.existsSync(path))
                arr.push({ path : `output/output${i}.ts`, name : `output${i}.ts`})
                }

                return arr
            }

        res.zip(handler(),()=>{

            //removing the original and converted files after sendind response
            fs.unlinkSync(req.file.path)
            fs.rmdir("output", { recursive: true }, (err) => {
                                if (err) {
                                    throw err;
                                }
                            
                                console.log(`output is deleted!`);
                            });
                        
        })
    }
    })
}
else
{
    res.status(400).send({err:"file not present"})
}

})

app.listen(process.env.PORT,()=>{
    console.log("server running on Port",process.env.PORT)
})