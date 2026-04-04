// import React, { useEffect, useState } from 'react';
// import { Container, Typography, Box, Card, CardContent, Button, Grid, AppBar, Toolbar, IconButton } from '@mui/material';
// import { useNavigate } from 'react-router-dom';
// import LogoutIcon from '@mui/icons-material/Logout';
// import DescriptionIcon from '@mui/icons-material/Description';
// import SchoolIcon from '@mui/icons-material/School';
// import { coursesAPI, documentsAPI, authAPI } from '../services/api';

// interface Course {
//   id: number;
//   name: string;
//   code: string;
//   description?: string;
// }

// interface Document {
//   id: number;
//   title: string;
//   file_name: string;
//   course: number;
// }

// const DashboardPage: React.FC = () => {
//   const navigate = useNavigate();
//   const [courses, setCourses] = useState<Course[]>([]);
//   const [documents, setDocuments] = useState<Document[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [userName, setUserName] = useState('');

//   useEffect(() => {
//     const userStr = localStorage.getItem('user');
//     if (userStr) {
//       try {
//         const user = JSON.parse(userStr);
//         setUserName(user.name || user.email || 'User');
//       } catch {
//         setUserStr(userStr);
//       }
//     }
//     fetchData();
//   }, []);

//   const setUserStr = (str: string) => {
//     setUserName(str);
//   };

//   const fetchData = async () => {
//     try {
//       const [coursesRes, documentsRes] = await Promise.all([
//         coursesAPI.getAll(),
//         documentsAPI.getAll(),
//       ]);
//       setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
//       setDocuments(Array.isArray(documentsRes.data) ? documentsRes.data : []);
//     } catch (error) {
//       console.error('Error fetching data:', error);
//       // If not logged in, redirect to login
//       if (error instanceof Error && 'response' in error && (error as any).response?.status === 401) {
//         window.location.href = '/login';
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLogout = async () => {
//     try {
//       await authAPI.logout();
//     } catch (error) {
//       console.error('Logout error:', error);
//     } finally {
//       localStorage.removeItem('token');
//       localStorage.removeItem('user');
//       window.location.href = '/login';
//     }
//   };

//   const getDocumentsByCourse = (courseId: number) => {
//     return documents.filter(doc => doc.course === courseId);
//   };

//   if (loading) {
//     return (
//       <Container maxWidth="lg">
//         <Box sx={{ mt: 4, textAlign: 'center' }}>
//           <Typography>Đang tải...</Typography>
//         </Box>
//       </Container>
//     );
//   }

//   return (
//     <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: '#f5f5f5' }}>
//       <AppBar position="static">
//         <Toolbar>
//           <SchoolIcon sx={{ mr: 2 }} />
//           <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
//             AI Chatbot - Dashboard
//           </Typography>
//           <Typography variant="body2" sx={{ mr: 2 }}>
//             {userName}
//           </Typography>
//           <IconButton color="inherit" onClick={handleLogout}>
//             <LogoutIcon />
//           </IconButton>
//         </Toolbar>
//       </AppBar>

//       <Container maxWidth="lg">
//         <Box sx={{ mt: 4, mb: 4 }}>
//           <Typography variant="h4" component="h1" gutterBottom>
//             Các môn học
//           </Typography>
//           <Typography variant="body1" color="text.secondary">
//             Chọn môn học để bắt đầu chat với AI
//           </Typography>
//         </Box>

//         {courses.length === 0 ? (
//           <Box sx={{ textAlign: 'center', mt: 4 }}>
//             <Typography color="text.secondary">
//               Chưa có môn học nào. Liên hệ admin để được thêm vào các môn học.
//             </Typography>
//           </Box>
//         ) : (
//           <Grid container spacing={3}>
//             {courses.map((course) => (
//               <Grid size={{ xs: 12, sm: 6, md: 4 }} key={course.id}>
//                 <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
//                   <CardContent sx={{ flexGrow: 1 }}>
//                     <Typography variant="h6" component="h2" gutterBottom>
//                       {course.name}
//                     </Typography>
//                     <Typography variant="body2" color="text.secondary" gutterBottom>
//                       {course.code}
//                     </Typography>
//                     {course.description && (
//                       <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
//                         {course.description}
//                       </Typography>
//                     )}

//                     {/* Documents count */}
//                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
//                       <DescriptionIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
//                       <Typography variant="body2" color="text.secondary">
//                         {getDocumentsByCourse(course.id).length} tài liệu
//                       </Typography>
//                     </Box>

//                     <Box sx={{ display: 'flex', gap: 1 }}>
//                       <Button
//                         variant="contained"
//                         fullWidth
//                         onClick={() => navigate(`/course/${course.id}`)}
//                       >
//                         Xem chi tiết
//                       </Button>
//                       <Button
//                         variant="outlined"
//                         onClick={() => navigate(`/chat?course=${course.id}`)}
//                         startIcon={<SchoolIcon />}
//                       >
//                         Chat
//                       </Button>
//                     </Box>
//                   </CardContent>
//                 </Card>
//               </Grid>
//             ))}
//           </Grid>
//         )}

//         {/* Documents Section */}
//         {documents.length > 0 && (
//           <Box sx={{ mt: 6, mb: 4 }}>
//             <Typography variant="h5" component="h2" gutterBottom>
//               Tài liệu gần đây
//             </Typography>
//             <Grid container spacing={2}>
//               {documents.slice(0, 6).map((doc) => (
//                 <Grid size={{ xs: 12, sm: 6, md: 4 }} key={doc.id}>
//                   <Card>
//                     <CardContent sx={{ display: 'flex', alignItems: 'center', py: 1.5 }}>
//                       <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
//                       <Box>
//                         <Typography variant="body2" fontWeight="medium">
//                           {doc.title}
//                         </Typography>
//                         <Typography variant="caption" color="text.secondary">
//                           {doc.file_name}
//                         </Typography>
//                       </Box>
//                     </CardContent>
//                   </Card>
//                 </Grid>
//               ))}
//             </Grid>
//           </Box>
//         )}
//       </Container>
//     </Box>
//   );
// };

// export default DashboardPage;
import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Card, CardContent, Button, Grid, AppBar, Toolbar, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LogoutIcon from '@mui/icons-material/Logout';
import DescriptionIcon from '@mui/icons-material/Description';
import SchoolIcon from '@mui/icons-material/School';
import { coursesAPI, documentsAPI, authAPI } from '../services/api';

interface Course {
  id: number;
  name: string;
  code: string;
  description?: string;
}

interface Document {
  id: number;
  title: string;
  file_name: string;
  course: number;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.name || user.email || 'User');
      } catch {
        setUserStr(userStr);
      }
    }
    fetchData();
  }, []);

  const setUserStr = (str: string) => {
    setUserName(str);
  };

  const fetchData = async () => {
    try {
      const [coursesRes, documentsRes] = await Promise.all([
        coursesAPI.getAll(),
        documentsAPI.getAll(),
      ]);
      setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
      setDocuments(Array.isArray(documentsRes.data) ? documentsRes.data : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      // If not logged in, redirect to login
      if (error instanceof Error && 'response' in error && (error as any).response?.status === 401) {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  const getDocumentsByCourse = (courseId: number) => {
    return documents.filter(doc => doc.course === courseId);
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography>Đang tải...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar position="static">
        <Toolbar>
          <SchoolIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            AI Chatbot - Dashboard
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {userName}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Các môn học
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Chọn môn học để bắt đầu chat với AI
          </Typography>
        </Box>

        {courses.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography color="text.secondary">
              Chưa có môn học nào. Liên hệ admin để được thêm vào các môn học.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {courses.map((course) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={course.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="h2" gutterBottom>
                      {course.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {course.code}
                    </Typography>
                    {course.description && (
                      <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
                        {course.description}
                      </Typography>
                    )}

                    {/* Documents count */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <DescriptionIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {getDocumentsByCourse(course.id).length} tài liệu
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => navigate(`/course/${course.id}`)}
                      >
                        Xem chi tiết
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => navigate(`/chat?course=${course.id}`)}
                        startIcon={<SchoolIcon />}
                      >
                        Chat
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Documents Section */}
        {documents.length > 0 && (
          <Box sx={{ mt: 6, mb: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Tài liệu gần đây
            </Typography>
            <Grid container spacing={2}>
              {documents.slice(0, 6).map((doc) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={doc.id}>
                  <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', py: 1.5 }}>
                      <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {doc.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {doc.file_name}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default DashboardPage;
