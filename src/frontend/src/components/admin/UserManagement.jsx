import React from 'react';
import PropTypes from 'prop-types';
import { format, parseISO } from 'date-fns';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  Typography,
  CircularProgress,
  Alert,
  Checkbox,
  Toolbar,
  Menu,
  ListItemIcon,
  ListItemText,
  Avatar,
  Switch,
  FormControlLabel,
  MenuItem,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useUserManagement } from '../../hooks/useUserManagement';

// --- HELPERS ---

const descendingComparator = (a, b, orderBy) => {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
};

const getComparator = (order, orderBy) => {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
};

const stableSort = (array, comparator) => {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
};

const headCells = [
  { id: 'name', numeric: false, disablePadding: true, label: 'Name' },
  { id: 'email', numeric: false, disablePadding: false, label: 'Email' },
  { id: 'role', numeric: false, disablePadding: false, label: 'Role' },
  { id: 'status', numeric: false, disablePadding: false, label: 'Status' },
  { id: 'lastLogin', numeric: false, disablePadding: false, label: 'Last Login' },
  { id: 'actions', numeric: false, disablePadding: false, label: 'Actions', sortable: false },
];

// --- SUB-COMPONENTS ---

function EnhancedTableHead(props) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } = props;
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            color="primary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{ 'aria-label': 'select all users' }}
          />
        </TableCell>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            {headCell.sortable === false ? (
              headCell.label
            ) : (
              <TableSortLabel
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : 'asc'}
                onClick={createSortHandler(headCell.id)}
              >
                {headCell.label}
              </TableSortLabel>
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

EnhancedTableHead.propTypes = {
  numSelected: PropTypes.number.isRequired,
  onRequestSort: PropTypes.func.isRequired,
  onSelectAllClick: PropTypes.func.isRequired,
  order: PropTypes.oneOf(['asc', 'desc']).isRequired,
  orderBy: PropTypes.string.isRequired,
  rowCount: PropTypes.number.isRequired,
};

const EnhancedTableToolbar = (props) => {
  const { numSelected, onRefresh, onExport } = props;

  return (
    <Toolbar sx={{ pl: { sm: 2 }, pr: { xs: 1, sm: 1 } }}>
      <Typography sx={{ flex: '1 1 100%' }} variant="h6" component="div">
        Users
      </Typography>

      {numSelected > 0 ? (
        <Tooltip title="Delete selected users">
          <IconButton aria-label="Delete selected users">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <>
          <Tooltip title="Export Data">
            <IconButton onClick={onExport} aria-label="Export data">
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh Data">
            <IconButton onClick={onRefresh} aria-label="Refresh data">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Toolbar>
  );
};

EnhancedTableToolbar.propTypes = {
  numSelected: PropTypes.number.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
};

// --- UTILITY FUNCTIONS ---

const getRoleChipColor = (role) => ({ admin: 'primary', manager: 'warning', editor: 'info' }[role] || 'default');
const getStatusChipColor = (status) => ({ active: 'success', suspended: 'error', pending: 'warning' }[status] || 'default');
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'PPpp');
  } catch (e) {
    return 'Invalid Date';
  }
};
const getUserInitials = (user) => `${user.firstName[0]}${user.lastName[0]}`;

// --- MAIN COMPONENT ---

const UserManagement = () => {
  const {
    users,
    loading,
    error,
    selected,
    page,
    rowsPerPage,
    order,
    orderBy,
    dense,
    openUserMenu,
    selectedUser,
    userDetailsOpen,
    fetchUsers,
    handleRequestSort,
    handleSelectAllClick,
    handleClick,
    handleChangePage,
    handleChangeRowsPerPage,
    setDense,
    handleUserMenuOpen,
    handleUserMenuClose,
    handleViewDetails,
    handleCloseDetails,
    handleResetPassword,
  } = useUserManagement();

  const isSelected = (id) => selected.indexOf(id) !== -1;

  const visibleUsers = stableSort(users, getComparator(order, orderBy)).slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - users.length) : 0;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 2 }}><Alert severity="error">{error}</Alert></Box>;

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <EnhancedTableToolbar numSelected={selected.length} onRefresh={fetchUsers} onExport={() => {}} />
        <TableContainer>
          <Table sx={{ minWidth: 750 }} size={dense ? 'small' : 'medium'}>
            <EnhancedTableHead
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={handleRequestSort}
              rowCount={users.length}
            />
            <TableBody>
              {visibleUsers.map((row) => {
                const isItemSelected = isSelected(row.id);
                const labelId = `enhanced-table-checkbox-${row.id}`;
                return (
                  <TableRow hover role="checkbox" aria-checked={isItemSelected} tabIndex={-1} key={row.id} selected={isItemSelected}>
                    <TableCell padding="checkbox">
                      <Checkbox color="primary" checked={isItemSelected} onClick={(event) => handleClick(event, row.id)} inputProps={{ 'aria-labelledby': labelId }} />
                    </TableCell>
                    <TableCell component="th" id={labelId} scope="row" padding="none">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.light' }}>{getUserInitials(row)}</Avatar>
                        <Typography variant="body2">{`${row.firstName} ${row.lastName}`}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell><Chip label={row.role} size="small" color={getRoleChipColor(row.role)} /></TableCell>
                    <TableCell><Chip label={row.status} size="small" color={getStatusChipColor(row.status)} /></TableCell>
                    <TableCell>{formatDate(row.lastLogin)}</TableCell>
                    <TableCell>
                      <IconButton onClick={(e) => handleUserMenuOpen(e, row)} aria-label="User actions"><MoreVertIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {emptyRows > 0 && (<TableRow style={{ height: (dense ? 33 : 53) * emptyRows }}><TableCell colSpan={7} /></TableRow>)}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={users.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      <FormControlLabel control={<Switch checked={dense} onChange={(event) => setDense(event.target.checked)} />} label="Dense padding" />

      <Menu anchorEl={openUserMenu} open={Boolean(openUserMenu)} onClose={handleUserMenuClose}>
        <MenuItem onClick={handleViewDetails}><ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon><ListItemText>View Details</ListItemText></MenuItem>
        <MenuItem onClick={handleResetPassword}><ListItemIcon><LockIcon fontSize="small" /></ListItemIcon><ListItemText>Reset Password</ListItemText></MenuItem>
      </Menu>

      <Dialog open={userDetailsOpen} onClose={handleCloseDetails} maxWidth="sm" fullWidth>
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box>
              <Typography variant="h6">{`${selectedUser.firstName} ${selectedUser.lastName}`}</Typography>
              <Typography>Email: {selectedUser.email}</Typography>
              <Typography>Role: {selectedUser.role}</Typography>
              <Typography>Status: {selectedUser.status}</Typography>
              <Typography>Last Login: {formatDate(selectedUser.lastLogin)}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;