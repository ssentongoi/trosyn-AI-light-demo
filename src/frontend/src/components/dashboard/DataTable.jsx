import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Box,
  Typography,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  KeyboardArrowLeft,
  KeyboardArrowRight,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Custom pagination actions
function TablePaginationActions({ count, page, rowsPerPage, onPageChange }) {
  const theme = useTheme();
  const totalPages = Math.ceil(count / rowsPerPage) - 1;

  const handleFirstPageButtonClick = (event) => {
    onPageChange(event, 0);
  };

  const handleBackButtonClick = (event) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (event) => {
    onPageChange(event, page + 1);
  };

  const handleLastPageButtonClick = (event) => {
    onPageChange(event, totalPages);
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page"
      >
        {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton
        onClick={handleBackButtonClick}
        disabled={page === 0}
        aria-label="previous page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= totalPages}
        aria-label="next page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= totalPages}
        aria-label="last page"
      >
        {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  );
}

TablePaginationActions.propTypes = {
  count: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
};

// Styled components
const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  '& .MuiTableHead-root': {
    backgroundColor: theme.palette.grey[50],
  },
  '& .MuiTableRow-root:hover': {
    backgroundColor: theme.palette.action.hover,
    cursor: 'pointer',
  },
  '& .MuiTableCell-root': {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  '& .MuiTablePagination-root': {
    borderTop: `1px solid ${theme.palette.divider}`,
  },
}));

const DataTable = ({
  columns,
  rows,
  title,
  onRowClick,
  pagination = true,
  rowsPerPageOptions = [5, 10, 25],
  defaultRowsPerPage = 10,
  sortable = true,
  stickyHeader = true,
  height = 'auto',
  ...props
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [orderBy, setOrderBy] = useState(columns[0]?.id || '');
  const [order, setOrder] = useState('asc');

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const sortedRows = useMemo(() => {
    if (!sortable) return rows;
    
    return [...rows].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      
      if (aValue < bValue) {
        return order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [rows, orderBy, order, sortable]);

  const paginatedRows = useMemo(() => {
    if (!pagination) return sortedRows;
    const startIndex = page * rowsPerPage;
    return sortedRows.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedRows, page, rowsPerPage, pagination]);

  const emptyRows = pagination
    ? rowsPerPage - Math.min(rowsPerPage, rows.length - page * rowsPerPage)
    : 0;

  return (
    <Box sx={{ width: '100%', height }}>
      {title && (
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
      )}
      <StyledTableContainer component={Paper} {...props}>
        <Table stickyHeader={stickyHeader} size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.numeric ? 'right' : 'left'}
                  padding={column.disablePadding ? 'none' : 'normal'}
                  sortDirection={orderBy === column.id ? order : false}
                >
                  {sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleRequestSort(column.id)}
                    >
                      {column.label}
                      {orderBy === column.id ? (
                        <Box component="span" sx={{
                          border: 0,
                          clip: 'rect(0 0 0 0)',
                          height: 1,
                          margin: -1,
                          overflow: 'hidden',
                          padding: 0,
                          position: 'absolute',
                          top: 20,
                          width: 1,
                        }}>
                          {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                        </Box>
                      ) : null}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRows.map((row, index) => {
              return (
                <TableRow
                  hover
                  role="checkbox"
                  tabIndex={-1}
                  key={row.id || index}
                  onClick={() => onRowClick && onRowClick(row)}
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    ...(onRowClick && { cursor: 'pointer' }),
                  }}
                >
                  {columns.map((column) => {
                    const value = row[column.id];
                    return (
                      <TableCell key={column.id} align={column.numeric ? 'right' : 'left'}>
                        {column.format ? column.format(value, row) : value}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={columns.length} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </StyledTableContainer>
      {pagination && (
        <TablePagination
          rowsPerPageOptions={rowsPerPageOptions}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          ActionsComponent={TablePaginationActions}
          sx={{
            '& .MuiTablePagination-toolbar': {
              paddingLeft: 2,
            },
          }}
        />
      )}
    </Box>
  );
};

DataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      numeric: PropTypes.bool,
      disablePadding: PropTypes.bool,
      format: PropTypes.func,
    })
  ).isRequired,
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  title: PropTypes.string,
  onRowClick: PropTypes.func,
  pagination: PropTypes.bool,
  rowsPerPageOptions: PropTypes.arrayOf(PropTypes.number),
  defaultRowsPerPage: PropTypes.number,
  sortable: PropTypes.bool,
  stickyHeader: PropTypes.bool,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default DataTable;
