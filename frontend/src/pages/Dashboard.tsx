import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardHeader,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Button,
  IconButton,
  CircularProgress,
  Chip,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Description as DocumentIcon,
  Notifications as NotificationsIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  AccessTime as TimeIcon,
  Public as PublicIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDocumentApi } from '../contexts/DocumentApiContext';
import { DocumentMetadata } from '../services/documentApi';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { parseISO } from 'date-fns/parseISO';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const documentApi = useDocumentApi();
  const { documentList } = documentApi;
  const [recentDocuments, setRecentDocuments] = useState<DocumentMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecentDocuments = async () => {
      try {
        setIsLoading(true);
        await documentApi.listDocuments(1, 5, { sort_by: 'updated_at', sort_order: 'desc' });
        setError(null);
      } catch (err) {
        console.error('Failed to load recent documents:', err);
        setError('Failed to load recent documents. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentDocuments();
  }, [documentApi]);

  useEffect(() => {
    setRecentDocuments(documentList.slice(0, 5));
  }, [documentList]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
  };

  const handleDocumentClick = (documentId: string) => {
    navigate(`/documents/${documentId}`);
  };

  const handleEditDocument = (e: React.MouseEvent, documentId: string) => {
    e.stopPropagation();
    navigate(`/documents/${documentId}`);
  };

  const quickActions = [
    { 
      title: 'New Document', 
      icon: <AddIcon />, 
      onClick: () => navigate('/documents/new') 
    },
    { 
      title: 'View All Documents', 
      icon: <DocumentIcon />, 
      onClick: () => navigate('/documents') 
    },
    { 
      title: 'Upload Document', 
      icon: <DocumentIcon />, 
      onClick: () => navigate('/documents/upload') 
    },
  ];

  interface Activity {
    id: number;
    text: string;
    time: string;
  }

  const recentActivities: Activity[] = [
    { id: 1, text: 'Document "Project Plan" was updated', time: '2 hours ago' },
    { id: 2, text: 'New comment on "Meeting Notes"', time: '5 hours ago' },
    { id: 3, text: 'User John Doe was added to your team', time: '1 day ago' }
  ];

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Quick Actions" />
            <CardContent>
              <List>
                {quickActions.map((action, index) => (
                  <React.Fragment key={action.title}>
                    <ListItem button onClick={action.onClick}>
                      <ListItemIcon sx={{ color: 'primary.main' }}>
                        {action.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={action.title} 
                        primaryTypographyProps={{ fontWeight: 'medium' }}
                      />
                    </ListItem>
                    {index < quickActions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
          
          {/* Recent Activity */}
          <Card sx={{ mt: 3 }}>
            <CardHeader title="Recent Activity" />
            <CardContent>
              <List>
                {recentActivities.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem>
                      <ListItemIcon>
                        <NotificationsIcon color="action" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={activity.text} 
                        secondary={activity.time}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                    {index < recentActivities.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Recent Documents */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader 
              title="Recent Documents" 
              action={
                <Button 
                  color="primary" 
                  startIcon={<DocumentIcon />}
                  onClick={() => navigate('/documents')}
                >
                  View All
                </Button>
              }
            />
            <CardContent>
              {isLoading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress />
                </Box>
              ) : error ? (
                <Box p={2} bgcolor="error.light" color="error.contrastText" borderRadius={1} mb={2}>
                  <Typography>{error}</Typography>
                </Box>
              ) : recentDocuments.length === 0 ? (
                <Box textAlign="center" p={3}>
                  <DocumentIcon color="action" sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography variant="body1" color="textSecondary" gutterBottom>
                    No recent documents found
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/editor')}
                    sx={{ mt: 1 }}
                  >
                    Create New Document
                  </Button>
                </Box>
              ) : (
                <List disablePadding>
                  {recentDocuments.map((doc, index) => (
                    <React.Fragment key={doc.id}>
                      <ListItem 
                        button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDocumentClick(doc.id);
                        }}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'action.hover',
                            '& .document-actions': {
                              visibility: 'visible',
                            },
                          },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.light' }}>
                            <DocumentIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center">
                              <Typography variant="subtitle1" noWrap sx={{ maxWidth: '60%' }}>
                                {doc.title || 'Untitled Document'}
                              </Typography>
                              {doc.is_public && (
                                <Tooltip title="Public document">
                                  <PublicIcon 
                                    fontSize="small" 
                                    color="action" 
                                    sx={{ ml: 1, fontSize: '1rem' }} 
                                  />
                                </Tooltip>
                              )}
                              {doc.tags && doc.tags.length > 0 && (
                                <Chip 
                                  label={doc.tags[0]} 
                                  size="small" 
                                  sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box component="span" display="flex" alignItems="center" flexWrap="wrap">
                              <TimeIcon fontSize="inherit" sx={{ fontSize: '1rem', mr: 0.5, opacity: 0.7 }} />
                              <Typography variant="caption" color="textSecondary" sx={{ mr: 2 }}>
                                {formatDate(doc.updated_at || doc.created_at || new Date().toISOString())}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {formatFileSize(doc.file_size || 0)}
                              </Typography>
                            </Box>
                          }
                        />
                        <Box className="document-actions" sx={{ visibility: 'hidden' }}>
                          <Tooltip title="View">
                            <IconButton size="small" onClick={(e) => {
                              e.stopPropagation();
                              handleDocumentClick(doc.id);
                            }}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={(e) => handleEditDocument(e, doc.id)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItem>
                      {index < recentDocuments.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
