require("dotenv").config();

const express =require("express");
const app=express();
const mongoose =require("mongoose");
const cors=require("cors")
const zod=require("zod");
const jwt=require("jsonwebtoken");
const uri=process.env.uri;
const password=process.env.password;
const company_password=process.env.company_password;
async function connectdb(){
   await mongoose.connect(uri);
   console.log("db is connected");
}
connectdb();

app.use(express.json());
app.use(cors());
const zod_user_schema=zod.object({
    name:zod.string().min(1),
    password:zod.string().min(5),
    email:zod.string().email(),
});
const zod_admin_schema=zod.object({
    name:zod.string().min(1),
    password:zod.string().min(5),
    email:zod.string().email(),
    company_password:zod.string(),
});
const user_schema=new mongoose.Schema({
    name:String,
    password:String,
    email:String,
    auth:String,
    course:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'course'
    }]
});
const admin_schema=new mongoose.Schema({
    name:String,
    password:String,
    email:String,
    auth:String,
    company_password:String
});
const course_schema=new mongoose.Schema({
    course_name:String
});



const user_model=mongoose.model('users',user_schema);
const admin_model=mongoose.model('admin',admin_schema);
const course_model=mongoose.model('course',course_schema);

app.post('/signup',async (req,res)=>{
    const req_verify=zod_user_schema.safeParse(req.body);
    if(req_verify.success){
        const already_exist=await user_model.findOne({email:req.body.email});
        if(already_exist){
            res.json({
                message:"account already exists for this email"
            })
            return;
        }
        const auth=await jwt.sign(req.body.email,password);
        const user=new user_model({
            name:req.body.name,
            password:req.body.password,
            email:req.body.email,
            auth:auth
        })
        const response =await user.save();
        console.log("saved");
        res.json(response);
    }
    else{
        res.status(404).json({
            message:"please enter correct detail"
        });
    }
})
app.post('/admin/signup',async (req,res)=>{
    const req_verify=zod_admin_schema.safeParse(req.body);
    if(req_verify.success){
        const already_exist=await admin_model.findOne({email:req.body.email});
        if(already_exist){
            res.json({
                message:"account already exists for this email"
            })
            return;
        }
        if(req.body.company_password!=company_password){
            res.json({
                message:"enter correct details"
            })
            return
        }
        const auth=await jwt.sign({email:req.body.email,company_password:req.body.company_password},password);
        const user=new admin_model({
            name:req.body.name,
            password:req.body.password,
            email:req.body.email,
            auth:auth,
            company_password:req.body.company_password
        })
        const response =await user.save();
        console.log("saved");
        res.json(response);
    }
    else{
        res.status(404).json({
            message:"please enter correct detail"
        });
    }
})

app.post('/signin',async (req,res)=>{
    const req_verify=zod_user_schema.safeParse(req.body);
    if(req_verify.success){
        const already_exist=await user_model.findOne({email:req.body.email});
        if(already_exist){
            const auth=await jwt.sign(req.body.email,password);
            res.json({
                auth:auth
            })
        }
        else{
            res.json({
                message:"account doesn't exist for this email"
            })
        }
    }
    else{
        res.status(404).send("please enter correct detail");
    }
})

app.post('/admin/signin',async (req,res)=>{
    const req_verify=zod_admin_schema.safeParse(req.body);
    if(req_verify.success){
        const already_exist=await admin_model.findOne({email:req.body.email});
        if(already_exist){
            const auth=await jwt.sign({email:req.body.email,company_password:req.body.company_password},password);
            res.json({
                auth:auth
            })
        }
        else{
            res.json({
                message:"account doesn't exist for this email"
            })
        }
    }
    else{
        res.status(404).send("please enter correct detail");
    }
})
app.post('/admin/course',auth_verification,async (req,res)=>{
    const already_exist=await course_model.findOne({course_name:req.body.course_name});
    if(already_exist){
        res.send("course already exists");
    }
    else{
        const course=new course_model({
            course_name:req.body.course_name,
        })
        course.save();
        res.send("new course is added");
    }
})
app.delete('/admin/course',admin_auth_verification,async (req,res)=>{
    const already_exist=await course_model.findOne({course_name:req.body.course_name});
    if(already_exist){
        await course_model.deleteOne({course_name:req.body.course_name});
        res.send("course is deleted");
    }
    else{
        res.send("course does not exists");
    }
})
async function admin_auth_verification(req,res,next){
    if(req.headers.admin_auth){
        try{
            jwt.verify(req.headers.admin_auth,password);
            next();
        }
        catch(e){
            res.send("please sign in again")
        }
    }
    else{
        res.send("please sign in again")
    }
    
}
async function auth_verification(req,res,next){
    if(req.headers.auth){
        try{
            jwt.verify(req.headers.auth,password);
            next();
        }
        catch(e){
            res.send("please sign in again")
        }
    }
    else{
        res.send("please sign in again")
    }
    
}

 async function check_course_added(user,course){
    const courses=await user.course;
    console.log(course._id);
    // console.log(courses);
    // console.log(courses.length);
    
    for(let i=0;i<courses.length;i++){
        if(courses[i].toString()==course._id.toString()){
            return true;
        }
    }
    // const us=await user_model.findOne({email:user.email,course:course._id}); 
    // console.log(us);
    // if(us)return true;
    return false;
}

app.get('/home',auth_verification,(req,res)=>{
    res.send('ok')
})
app.put('/home',auth_verification,async(req,res)=>{
    const decoded_token=await jwt.decode(req.headers.auth);
    const user=await user_model.findOne({email:decoded_token});
    const course=await course_model.findOne({course_name:req.body.course_name});
    if(course){
        
       const response=await check_course_added(user,course);
       if(response){
            res.send("course already added");
            return ;
        }
        await user.course.push(course._id)
        await user.save();
        res.send("course is added")
    }
    else{
        res.send("course does not exists");
    }
})
app.delete('/home',auth_verification,async(req,res)=>{
    const decoded_token=await jwt.decode(req.headers.auth);
    const user=await user_model.findOne({email:decoded_token});
    const course=await course_model.findOne({course_name:req.body.course_name});
    if(course){
        
       const response=await check_course_added(user,course);
       if(!response){
            res.send("course does is not added");
            return ;
        }
        await user_model.findByIdAndUpdate(user._id,{$pull:{course:course._id}})
        // await user.save();
        res.send("course is deleted")
    }
    else{
        res.send("course does not exists");
    }
})
app.listen(3000,()=>{
    console.log("app is listening at port 3000");
})