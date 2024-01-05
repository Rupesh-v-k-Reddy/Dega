const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")

const app = express()
dotenv.config()

// middlewares
app.use(cors())
app.use(express.json())
app.use(middleware1)
app.use(logger)

function middleware1(req,res,next){
    const regex = new RegExp('(test)|(trial)|(noreply)');
    let isInternalEmail = regex.test(req.body.email.toLowerCase())
    if(isInternalEmail){
        res.status(403).send("Forbidden : Email not valid")
    }
    else{
        next()
    }
}


function logger(req,res,next){
    console.log(req.body)
    next()
}


app.get("/", (req,res)=>{
    res.send("Welcome to the API server")
})

app.listen(process.env.PORT, ()=>{
    console.log(`Server listening on port : ${process.env.PORT}`)
})