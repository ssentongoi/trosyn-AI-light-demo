import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Divider,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  CloudUpload as UploadIcon,
  Search as SearchIcon,
  CloudDownload as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  FolderOpen as FolderOpenIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { bytesToSize } from '../utils/fileUtils';

const DocumentsPage = () => {
  const theme = useTheme();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Mock data - replace with API calls
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await documentService.getDocuments();
        // setDocuments(response.data);
        
        // Mock data
        setTimeout(() => {
          setDocuments([
            {
              id: 1,
              title: 'Project Proposal.docx',
              file_type: 'docx',
              file_size: 2457600,
              created_at: new Date('2023-10-15T10:30:00'),
              updated_at: new Date('2023-10-16T14:45:00'),
              owner: { name: 'John Doe' },
              is_encrypted: false
            },
            {
              id: 2,
              title: 'Q1 Report.pdf',
              file_type: 'pdf',
              file_size: 5242880,
              created_at: new Date('2023-10-10T09:15:00'),
              updated_at: new Date('2023-10-12T16:20:00'),
              owner: { name: 'Jane Smith' },
              is_encrypted: true
            },
            // Add more mock documents as needed
          ]);
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError('Failed to load documents. Please try again.');
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleMenuOpen = (event, document) => {
    setAnchorEl(event.currentTarget);
    setSelectedDoc(document);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDoc(null);
  };

  const handleDownload = (document) => {
    // TODO: Implement download functionality
    console.log('Download document:', document);
    setSnackbar({
      open: true,
      message: `Downloading ${document.title}...`,
      severity: 'info'
    });
    handleMenuClose();
  };

  const handleDelete = (document) => {
    // TODO: Implement delete functionality
    console.log('Delete document:', document);
    setSnackbar({
      open: true,
      message: `Deleted ${document.title}`,
      severity: 'success'
    });
    handleMenuClose();
  };

  const handleShare = (document) => {
    // TODO: Implement share functionality
    console.log('Share document:', document);
    setSnackbar({
      open: true,
      message: `Sharing options for ${document.title}`,
      severity: 'info'
    });
    handleMenuClose();
  };

  const handleUpload = (event) => {
    // TODO: Implement file upload
    const file = event.target.files[0];
    if (file) {
      console.log('Uploading file:', file);
      setSnackbar({
        open: true,
        message: `Uploading ${file.name}...`,
        severity: 'info'
      });
    }
  };

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    setPage(0); // Reset to first page on new search
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredDocuments.length) : 0;

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'pdf':
        return <FileIcon color="error" />;
      case 'docx':
      case 'doc':
        return <FileIcon color="primary" />;
      case 'xlsx':
      case 'xls':
        return <FileIcon sx={{ color: 'success.main' }} />;
      case 'pptx':
      case 'ppt':
        return <FileIcon sx={{ color: 'warning.main' }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileIcon sx={{ color: 'info.main' }} />;
      default:
        return <FileIcon />;
    }
  };

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link color="inherit" href="/">
            Home
          </Link>
          <Typography color="text.primary">Documents</Typography>
        </Breadcrumbs>
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Documents & Files
          </Typography>
          <Box>
            <input
              accept="*/*"
              style={{ display: 'none' }}
              id="upload-file"
              type="file"
              onChange={handleUpload}
            />
            <label htmlFor="upload-file">
              <Button
                variant="contained"
                color="primary"
                startIcon={<UploadIcon />}
                component="span"
                sx={{ mr: 1 }}
              >
                Upload
              </Button>
            </label>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              sx={{ ml: 1 }}
              // TODO: Implement new folder functionality
              onClick={() => console.log('Create new folder')}
            >
              New Folder
            </Button>
          </Box>
        </Box>
      </Box>

      <Card>
        <CardHeader
          title={
            <Box display="flex" alignItems="center">
              <FolderOpenIcon sx={{ mr: 1 }} />
              <Typography variant="h6">My Documents</Typography>
            </Box>
          }
          action={
            <TextField
              size="small"
              variant="outlined"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={handleSearch}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
              }}
              sx={{ width: 300 }}
            />
          }
        />
        <Divider />
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Owner</TableCell>
                      <TableCell>Last Modified</TableCell>
                      <TableCell>File Size</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredDocuments
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((doc) => (
                        <TableRow hover key={doc.id}>
                          <TableCell>
                            <Box display="flex" alignItems="center">
                              {getFileIcon(doc.file_type)}
                              <Box ml={1}>
                                <Typography variant="body2">{doc.title}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {doc.file_type?.toUpperCase()}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{doc.owner?.name || 'N/A'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {format(new Date(doc.updated_at), 'MMM d, yyyy h:mm a')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {bytesToSize(doc.file_size || 0)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="More actions">
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, doc)}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    {emptyRows > 0 && (
                      <TableRow style={{ height: 53 * emptyRows }}>
                        <TableCell colSpan={5} />
                      </TableRow>
                    )}
                    {filteredDocuments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <FolderOpenIcon fontSize="large" color="disabled" />
                          <Typography variant="subtitle1" color="textSecondary">
                            No documents found
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {searchQuery
                              ? 'Try adjusting your search'
                              : 'Upload your first document to get started'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredDocuments.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Document Actions Menu */}
      <Menu
        id="document-actions-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleDownload(selectedDoc)}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Download
        </MenuItem>
        <MenuItem onClick={() => handleShare(selectedDoc)}>
          <ShareIcon fontSize="small" sx={{ mr: 1 }} />
          Share
        </MenuItem>
        <MenuItem>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Rename
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => handleDelete(selectedDoc)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DocumentsPage;
