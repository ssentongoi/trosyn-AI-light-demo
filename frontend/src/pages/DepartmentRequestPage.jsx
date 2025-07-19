import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  Typography,
  useTheme,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  Tooltip,
  Tabs,
  Tab,
  InputAdornment,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import DepartmentRequestDialog from '../components/department/DepartmentRequestDialog';
import DepartmentRequestForm from '../components/department/DepartmentRequestForm';

// Mock data - replace with API calls
const mockRequests = [
  {
    id: 'REQ-2023-001',
    title: 'New Laptop Request',
    description: 'Request for a new development laptop with 32GB RAM and 1TB SSD',
    status: 'pending',
    priority: 'high',
    type: 'equipment',
    requester: { id: 1, name: 'John Doe', email: 'john.doe@example.com', avatar: 'JD' },
    department: { id: 101, name: 'Engineering' },
    created_at: new Date('2023-10-15T10:30:00'),
    updated_at: new Date('2023-10-15T10:30:00'),
    due_date: new Date('2023-11-15T23:59:59'),
    attachments: [
      { id: 1, name: 'quote.pdf', size: 2457600, type: 'application/pdf' },
      { id: 2, name: 'specs.docx', size: 1024000, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    ]
  },
  // Add more mock requests as needed
];

const DepartmentRequestPage = () => {
  const theme = useTheme();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openRequestDialog, setOpenRequestDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [sortConfig, setSortConfig] = useState({
    field: 'created_at',
    direction: 'desc'
  });

  // Load requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        // const response = await requestService.getRequests();
        // setRequests(response.data);
        
        // Mock data
        setTimeout(() => {
          setRequests(mockRequests);
          setLoading(false);
        }, 800);
      } catch (err) {
        console.error('Error fetching requests:', err);
        setError('Failed to load requests. Please try again.');
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPage(0); // Reset to first page when changing tabs
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (field) => {
    const isAsc = sortConfig.field === field && sortConfig.direction === 'asc';
    setSortConfig({
      field,
      direction: isAsc ? 'desc' : 'asc'
    });
  };

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    setPage(0); // Reset to first page on new search
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenRequestDialog = (request) => {
    setSelectedRequest(request);
    setOpenRequestDialog(true);
  };

  const handleCloseRequestDialog = () => {
    setOpenRequestDialog(false);
    setSelectedRequest(null);
  };

  const handleSubmitRequest = async (formData) => {
    try {
      // TODO: Replace with actual API call
      // const response = await requestService.createRequest(formData);
      // setRequests(prev => [response.data, ...prev]);
      
      // Mock success
      const newRequest = {
        ...formData,
        id: `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'pending',
        requester: { id: 1, name: 'Current User', email: 'user@example.com', avatar: 'CU' },
        department: { id: 101, name: formData.department || 'Engineering' },
        created_at: new Date(),
        updated_at: new Date(),
        attachments: formData.attachments || []
      };
      
      setRequests(prev => [newRequest, ...prev]);
      handleCloseDialog();
      
      setSnackbar({
        open: true,
        message: 'Request submitted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error submitting request:', error);
      setSnackbar({
        open: true,
        message: 'Failed to submit request. Please try again.',
        severity: 'error'
      });
    }
  };

  // Filter and sort requests
  const filteredRequests = requests.filter(request => {
    // Filter by tab
    if (activeTab === 'pending') return request.status === 'pending';
    if (activeTab === 'approved') return request.status === 'approved';
    if (activeTab === 'rejected') return request.status === 'rejected';
    if (activeTab === 'mine') return request.requester.id === 1; // Mock current user ID
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        request.title.toLowerCase().includes(query) ||
        request.description.toLowerCase().includes(query) ||
        request.id.toLowerCase().includes(query) ||
        request.requester.name.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Sort requests
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Pagination
  const paginatedRequests = sortedRequests.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Helper functions
  const getStatusChip = (status) => {
    switch (status) {
      case 'approved':
        return <Chip icon={<CheckCircleIcon />} label="Approved" color="success" size="small" />;
      case 'rejected':
        return <Chip icon={<CancelIcon />} label="Rejected" color="error" size="small" />;
      case 'pending':
      default:
        return <Chip icon={<PendingIcon />} label="Pending" color="warning" size="small" />;
    }
  };

  const getPriorityChip = (priority) => {
    switch (priority) {
      case 'high':
        return <Chip label="High" color="error" size="small" variant="outlined" />;
      case 'medium':
        return <Chip label="Medium" color="warning" size="small" variant="outlined" />;
      case 'low':
      default:
        return <Chip label="Low" color="success" size="small" variant="outlined" />;
    }
  };

  const getRequestTypeIcon = (type) => {
    switch (type) {
      case 'equipment':
        return <AssignmentIcon color="primary" />;
      case 'personnel':
        return <PersonIcon color="secondary" />;
      case 'training':
        return <GroupIcon color="info" />;
      default:
        return <DescriptionIcon color="action" />;
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center">
            <AssignmentIcon sx={{ mr: 1, fontSize: 32 }} />
            <Typography variant="h4" component="h1">
              Department Requests
            </Typography>
          </Box>
          <Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
              sx={{ mr: 1 }}
            >
              New Request
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2 }}
        >
          <Tab label="All" value="all" />
          <Tab 
            label={
              <Box display="flex" alignItems="center">
                Pending
                {requests.filter(r => r.status === 'pending').length > 0 && (
                  <Chip 
                    label={requests.filter(r => r.status === 'pending').length} 
                    size="small" 
                    color="warning"
                    sx={{ ml: 1, height: 20, minWidth: 20 }} 
                  />
                )}
              </Box>
            } 
            value="pending" 
          />
          <Tab label="Approved" value="approved" />
          <Tab label="Rejected" value="rejected" />
          <Tab label="My Requests" value="mine" />
        </Tabs>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <TextField
            size="small"
            variant="outlined"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          <Box>
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              sx={{ mr: 1 }}
            >
              Filters
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
            >
              Export
            </Button>
          </Box>
        </Box>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : filteredRequests.length === 0 ? (
            <Box textAlign="center" p={4}>
              <AssignmentIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No requests found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {activeTab === 'all' 
                  ? 'There are no requests to display.' 
                  : `There are no ${activeTab} requests.`}
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />} 
                sx={{ mt: 2 }}
                onClick={handleOpenDialog}
              >
                Create New Request
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig.field === 'id'}
                        direction={sortConfig.field === 'id' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('id')}
                      >
                        Request ID
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig.field === 'title'}
                        direction={sortConfig.field === 'title' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('title')}
                      >
                        Title
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Requester</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig.field === 'created_at'}
                        direction={sortConfig.field === 'created_at' ? sortConfig.direction : 'desc'}
                        onClick={() => handleSort('created_at')}
                      >
                        Created
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedRequests.map((request) => {
                    // Safely extract values with defaults
                    const requestId = String(request?.id || '');
                    const requestType = request?.type || '';
                    const requestTitle = request?.title || 'No title';
                    const requesterName = request?.requester?.name || 'Unknown';
                    const departmentName = request?.department?.name || 'No Department';
                    const priority = request?.priority || 'low';
                    const status = request?.status || 'pending';
                    const createdAt = request?.created_at ? new Date(request.created_at) : new Date();
                    
                    // Generate initials for avatar
                    const getInitials = (name) => {
                      if (!name) return '?';
                      return name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();
                    };
                    
                    return (
                      <TableRow 
                        key={requestId}
                        hover
                        sx={{ '&:hover': { cursor: 'pointer' } }}
                        onClick={() => handleOpenRequestDialog(request)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {requestId || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={requestType ? requestType.charAt(0).toUpperCase() + requestType.slice(1) : ''}>
                            <span>
                              {getRequestTypeIcon(requestType)}
                            </span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                            {requestTitle}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Avatar 
                              sx={{ 
                                width: 32, 
                                height: 32, 
                                mr: 1,
                                bgcolor: theme.palette.primary.main,
                                color: theme.palette.primary.contrastText,
                                fontSize: '0.75rem'
                              }}
                            >
                              {getInitials(requesterName)}
                            </Avatar>
                            <Typography variant="body2">
                              {requesterName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={departmentName} 
                            size="small" 
                            variant="outlined" 
                          />
                        </TableCell>
                        <TableCell>
                          {getPriorityChip(priority)}
                        </TableCell>
                        <TableCell>
                          {getStatusChip(status)}
                        </TableCell>
                        <TableCell>
                          <Tooltip title={format(createdAt, 'PPpp')}>
                            <Typography variant="body2">
                              {formatDistanceToNow(createdAt, { addSuffix: true })}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRequestDialog(request);
                              }}
                              aria-label="View request details"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredRequests.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* New Request Dialog */}
      <DepartmentRequestForm 
        open={openDialog} 
        onClose={handleCloseDialog} 
        onSubmit={handleSubmitRequest} 
      />

      {/* Request Details Dialog */}
      {selectedRequest && (
        <DepartmentRequestDialog 
          open={openRequestDialog} 
          onClose={handleCloseRequestDialog} 
          request={selectedRequest}
          onApprove={() => {
            // Handle approve
            const updatedRequests = requests.map(req => 
              req.id === selectedRequest.id 
                ? { ...req, status: 'approved', updated_at: new Date() }
                : req
            );
            setRequests(updatedRequests);
            setSelectedRequest({...selectedRequest, status: 'approved', updated_at: new Date()});
            handleCloseRequestDialog();
            
            setSnackbar({
              open: true,
              message: 'Request approved successfully',
              severity: 'success'
            });
          }}
          onReject={(reason) => {
            // Handle reject
            const updatedRequests = requests.map(req => 
              req.id === selectedRequest.id 
                ? { ...req, status: 'rejected', updated_at: new Date() }
                : req
            );
            setRequests(updatedRequests);
            setSelectedRequest({...selectedRequest, status: 'rejected', updated_at: new Date()});
            handleCloseRequestDialog();
            
            setSnackbar({
              open: true,
              message: 'Request has been rejected',
              severity: 'info'
            });
          }}
          onComment={(comment) => {
            // Handle comment
            const updatedRequests = requests.map(req => 
              req.id === selectedRequest.id 
                ? { ...req, updated_at: new Date() }
                : req
            );
            setRequests(updatedRequests);
            handleCloseRequestDialog();
            
            setSnackbar({
              open: true,
              message: 'Comment added successfully',
              severity: 'success'
            });
          }}
        />
      )}

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

export default DepartmentRequestPage;
