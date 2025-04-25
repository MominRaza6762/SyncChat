import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext'; 
import API from '../services/api';
import { replace, useNavigate } from 'react-router-dom';
import "../assets/login.css"


export default function Login() {
    const [name, setName] = useState("");
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const {  setAlert  , setUser } = useAuth(); 
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [otp, setOTP] = useState('');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
   
    const handleImageChange = (event) => {
      const file = event.target.files[0];
  
      if (file) {
        if (!file.type.startsWith("image/")) {
          setAlert({msg:"Only image files are allowed.", type:"error"});
          return;
        }
  
        if (file.size > 1024 * 1024) {
          setAlert({msg:"Image must be less than 1MB.", type:"error"});
          return;
        }
        setAlert({msg:"", type:""});  
        setImage(file);
        setPreview(URL.createObjectURL(file)); 
      }
    };

    const handleSubmit = async () => {
     
      if (!name || !image) {
        setAlert({msg:"Please enter your name and select an image.", type:"error"});
        return;
      }
  
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("profilePic", image);
  
      try {
        setAlert({msg:"Saving your profile...", type:"loading"});
        const response = await API.put("/auth/save_profile", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setUser({auth:true})
          localStorage.setItem("user", JSON.stringify({auth:true}));
          setAlert({msg:response.data.message ,type:'success'});
          setTimeout(() => {
            navigate("/chat", replace)
          }, 1000);

      } catch (error) {
        setAlert({msg:error.response.data.message, type:"error"});
      }
    };


    const verifyOTP = async () => {
        if(otp.length!==6)
        {
             return setAlert({msg:"OTP must be 6-digit",type:'error'});
        }
        try {
          setLoading(true);
          setAlert({msg:'verifing otp...',type:'loading'});
          const response = await API.post('/auth/verify_otp', { email, otp });
          if(response.status === 201 && response.data.newUser)
          {
            setAlert({msg:'Complete your profile!',type:'info'});
            setStep(3)
          }
          else{
              setUser({auth:true})
              localStorage.setItem("user", JSON.stringify({auth:true}));
              setAlert({msg:'OTP verified successfully...',type:'success'});
              setTimeout(() => {
             
                navigate("/chat", replace)
              }, 1000);
          }
          setLoading(false);
        } catch (err) {
            if(err.response.status===400)
                {
                    setAlert({msg:`${err.response.data.message}`,type:'error'});
                }
                else{
                    
                    setAlert({msg:'Server Error',type:'error'});
                }
                setOTP('');
                setLoading(false);
        }
      };
    
    const sendOTP = async () => {
        if(!email.trim())
            {
                return setAlert({msg:"Email is required",type:'error'});
            }
            else if(!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email))
            {
                return setAlert({msg:"Invalid email format",type:'error'});

            }
            
        try {
          setLoading(true);
          setAlert({msg:'Seding otp... ',type:'loading'});
          const response = await API.post('/auth/send_otp', { email });
          setStep(2);
          setAlert({msg:`${response.data.message}`,type:'success'});
          setLoading(false);
        } 
        catch (err) {
            if(err.response.status===429)
            {
                setAlert({msg:`${err.response.data.message}`,type:'error'});
            }
            else{
                
                setAlert({msg:'Server Error',type:'error'});
            }
            setLoading(false);
        }
      };
  
  
  
    return (
      <div className='login'>
        
        {step === 1 ? (
          <div className='content'>
            <img src="/images/cropedlogo.png" alt="logo" />
            <input
              type="email"
              placeholder='Enter Your Mail'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={sendOTP} style={loading?{cursor:"not-allowed"}:null} disabled={loading}>Log in</button>
          </div>
        ) : <>{step === 2? <div className='content'>
            <img src="/images/cropedlogo.png" alt="logo" />
            <input
              type="text"
              placeholder='Enter 6-digit OTP'
              value={otp}
              onChange={(e) => setOTP(e.target.value)}
            />
            <button onClick={verifyOTP} disabled={loading}>Verify OTP</button>
          </div>:<div className='content'>
          <img src="/images/cropedlogo.png" alt="logo" />
          <h2>Profile</h2>
          <label className="image-upload">
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {preview ? <img src={preview} alt="Preview" className="preview-image" /> : <span>+</span>}
          </label>
          <input
              type="text"
              placeholder='Enter Your Full Name'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button onClick={handleSubmit} disabled={loading}>Save Profile</button>
          </div>
        }
         
        </>}
        
      </div>
    );

}
