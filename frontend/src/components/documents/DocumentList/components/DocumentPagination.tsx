import React from 'react';
import { TablePagination, Box, useTheme } from '@mui/material';

interface DocumentPaginationProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  rowsPerPageOptions?: number[];
  showFirstButton?: boolean;
  showLastButton?: boolean;
  disabled?: boolean;
}

const DocumentPagination: React.FC<DocumentPaginationProps> = ({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 25, 50, 100],
  showFirstButton = true,
  showLastButton = true,
  disabled = false,
}) => {
  const theme = useTheme();

  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ) => {
    onPageChange(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onRowsPerPageChange(parseInt(event.target.value, 10));
    onPageChange(0); // Reset to first page when rows per page changes
  };

  if (count <= 0) {
    return null;
  }

  return (
    <Box
      data-testid="mock-document-pagination"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        p: 1,
        borderTop: `1px solid ${theme.palette.divider}`,
      }}
    >
      <TablePagination
        component="div"
        count={count}
        page={page}
        onPageChange={(e, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) =>
          onRowsPerPageChange(parseInt(e.target.value, 10))
        }
        rowsPerPageOptions={rowsPerPageOptions}
        showFirstButton={showFirstButton}
        showLastButton={showLastButton}
        disabled={disabled}
        labelDisplayedRows={({ from, to, count }) => {
          const displayText = `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`;
          return (
            <span data-testid="pagination-info">
              {displayText}
            </span>
          );
        }}
        sx={{
          '& .MuiTablePagination-toolbar': {
            padding: 0,
          },
          '& .MuiTablePagination-displayedRows': {
            margin: 0,
          },
        }}
      />
    </Box>
  );
};

export default React.memo(DocumentPagination);
