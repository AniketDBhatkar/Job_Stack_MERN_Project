import React, { useState } from 'react';
import axios from 'axios';

const App = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  // Handle file selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setMessage('Please select a file first.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(
        'http://localhost:6011/company/upload-file/company_logos',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            // user Token 
            // 'Authorization': "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFuaWtldGJoYXRrYXI3ODZAZ21haWwuY29tIiwiaWF0IjoxNzYyNjc0OTQ0LCJleHAiOjE3NjI3NjEzNDR9.WLsU8h67j59qaJL7nSDGltjsRFl5Dd0n05cxCYiAoF4"
            //  company Token
            'Authorization':"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFuaWtldGJoYXRrYXI3ODZAZ21haWwuY29tIiwiaWF0IjoxNzYyNjg5NzQ4LCJleHAiOjE3NjI3NzYxNDh9.8_6RRR03dzPHkJGLwrXE06Re6v1uycAopXKoyUbF5WQ"
          }
        }
      );
      setMessage('File uploaded successfully!');
      console.log(response.data);
    } catch (error) {
      console.error(error);
      setMessage('Error uploading file.');
    }
  };

  return (
    <div style={{ width: '400px', margin: '50px auto', textAlign: 'center' }}>
      <form onSubmit={handleSubmit}>
        <h2>Upload Resume</h2>
        <input type="file" name="file" onChange={handleFileChange} />
        <br /><br />
        <button type="submit">Upload</button>
      </form>

      {message && <p style={{ marginTop: '20px' }}>{message}</p>}
    </div>
  );
};

export default App;