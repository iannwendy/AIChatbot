// import React, { useState } from 'react';
// import { Container, Typography, Button, Box, TextField, Alert } from '@mui/material';
// import { AdminPanelSettings as AdminIcon } from '@mui/icons-material';
// import axios from 'axios';
// import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';

// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// const AdminLoginPage: React.FC = () => {
//   const navigate = useNavigate();
//   const { login } = useAuth();
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');
//     setLoading(true);

//     try {
//       const response = await axios.post(`${API_BASE_URL}/auth/admin-login/`, {
//         username,
//         password,
//       }, { withCredentials: true });

//       if (response.data.success) {
//         const token = `admin_${response.data.user_id}_${Date.now()}`;
//         login({
//           id: response.data.user_id,
//           username: 'admin',
//           email: '',
//           full_name: 'Administrator',
//           role: response.data.role || 'admin',
//         }, token);
//         navigate('/admin/dashboard');
//       }
//     } catch (err: any) {
//       setError(err.response?.data?.error || 'Đăng nhập thất bại');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Container maxWidth="xs">
//       <Box
//         sx={{
//           marginTop: 8,
//           display: 'flex',
//           flexDirection: 'column',
//           alignItems: 'center',
//         }}
//       >
//         <AdminIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
//         <Typography component="h1" variant="h5" gutterBottom>
//           Đăng nhập Admin
//         </Typography>

//         {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}

//         <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
//           <TextField
//             fullWidth
//             label="Tên đăng nhập"
//             margin="normal"
//             value={username}
//             onChange={(e) => setUsername(e.target.value)}
//             autoFocus
//           />
//           <TextField
//             fullWidth
//             label="Mật khẩu"
//             type="password"
//             margin="normal"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//           />
//           <Button
//             type="submit"
//             fullWidth
//             variant="contained"
//             disabled={loading}
//             sx={{ mt: 2, mb: 2, py: 1.5 }}
//           >
//             {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
//           </Button>
//         </Box>

//         <Typography
//           variant="caption"
//           color="text.secondary"
//           sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
//           onClick={() => window.location.href = '/login'}
//         >
//           Quay lại trang đăng nhập
//         </Typography>
//       </Box>
//     </Container>
//   );
// };

// export default AdminLoginPage;
import React, { useState } from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  TextField,
  Alert,
} from "@mui/material";
import { AdminPanelSettings as AdminIcon } from "@mui/icons-material";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/admin-login/`,
        {
          username,
          password,
        },
        { withCredentials: true },
      );

      if (response.data.success) {
        const token = `admin_${response.data.user_id}_${Date.now()}`;
        login(
          {
            id: response.data.user_id,
            username: "admin",
            email: "",
            full_name: "Administrator",
            role: response.data.role || "admin",
          },
          token,
        );
        navigate("/admin/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <AdminIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
        <Typography component="h1" variant="h5" gutterBottom>
          Đăng nhập Admin
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
          <TextField
            fullWidth
            label="Tên đăng nhập"
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          <TextField
            fullWidth
            label="Mật khẩu"
            type="password"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ mt: 2, mb: 2, py: 1.5 }}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
          onClick={() => (window.location.href = "/login")}
        >
          Quay lại trang đăng nhập
        </Typography>
      </Box>
    </Container>
  );
};

export default AdminLoginPage;
