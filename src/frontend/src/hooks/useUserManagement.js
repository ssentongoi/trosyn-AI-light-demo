import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';

// --- MOCK DATA AND HELPERS ---

const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

const STATUSES = [
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'inactive', label: 'Inactive', color: 'default' },
  { value: 'suspended', label: 'Suspended', color: 'error' },
  { value: 'pending', label: 'Pending', color: 'warning' },
];

const generateMockUsers = (count = 50) => {
  const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller'];
  
  return Array.from({ length: count }, (_, i) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const lastLogin = new Date();
    lastLogin.setDate(lastLogin.getDate() - Math.floor(Math.random() * 30));
    
    return {
      id: `user-${i + 1}`,
      firstName,
      lastName,
      email,
      role: ROLES[Math.floor(Math.random() * ROLES.length)].value,
      status: STATUSES[Math.floor(Math.random() * STATUSES.length)].value,
      lastLogin: lastLogin.toISOString(),
      avatar: `https://i.pravatar.cc/150?u=${email}`,
    };
  });
};

export const useUserManagement = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');
  const [dense, setDense] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      try {
        const mockUsers = generateMockUsers(50);
        setUsers(mockUsers);
        setError(null);
      } catch (err) {
        setError('Failed to load users.');
        enqueueSnackbar('Failed to fetch users', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    }, 1000); // Simulate network delay
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = users.map((n) => n.id);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    setSelected(newSelected);
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleUserMenuOpen = (event, user) => {
    setSelectedUser(user);
    setOpenUserMenu(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setOpenUserMenu(null);
  };

  const handleViewDetails = () => {
    setUserDetailsOpen(true);
    handleUserMenuClose();
  };
  
  const handleCloseDetails = () => {
      setUserDetailsOpen(false);
  }

  const handleResetPassword = () => {
    enqueueSnackbar(`Password reset link sent to ${selectedUser.email}`, { variant: 'success' });
    handleUserMenuClose();
  };

  return {
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
  };
};
