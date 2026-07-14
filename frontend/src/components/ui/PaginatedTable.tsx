import { useState, useMemo } from 'react';
import { Table, Pagination, Form, Button, ButtonGroup } from 'react-bootstrap';

interface Column {
  key: string;
  label: string | React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  sortable?: boolean;
  render?: (value: any, item: any) => React.ReactNode;
}

interface PaginatedTableProps {
  columns: Column[];
  data: any[];
  title?: string | React.ReactNode; 
  onAdd?: () => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onView?: (item: any) => void;
  addButtonText?: string;
  emptyMessage?: string;
  showActions?: boolean;
  pageSize?: number;
  showPageSizeSelector?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (item: any) => void;
}

export default function PaginatedTable({ 
  columns, 
  data, 
  title,
  onAdd, 
  onEdit, 
  onDelete, 
  onView,
  onRowClick,  
  addButtonText = 'Nuevo',
  emptyMessage = 'No hay registros',
  showActions = true,
  pageSize = 10,
  showPageSizeSelector = true,
  searchable = true,
  searchPlaceholder = 'Buscar...'
}: PaginatedTableProps) {
  
  // Estados
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filtrar datos por búsqueda
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(item => {
      return columns.some(col => {
        const value = item[col.key];
        if (value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())) {
          return true;
        }
        return false;
      });
    });
  }, [data, searchTerm, columns]);

  // Ordenar datos
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginar datos
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Handlers
  const handleSort = (key: string) => {
    if (sortColumn === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  // Generar items de paginación
  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
      items.push(
        <Pagination.First key="first" onClick={() => handlePageChange(1)} />,
        <Pagination.Ellipsis key="ellipsis-start" disabled />
      );
    }
    
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item 
          key={i} 
          active={i === currentPage}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }
    
    if (endPage < totalPages) {
      items.push(
        <Pagination.Ellipsis key="ellipsis-end" disabled />,
        <Pagination.Last key="last" onClick={() => handlePageChange(totalPages)} />
      );
    }
    
    return items;
  };

  // Columna de acciones
  const actionColumn: Column = {
    key: 'acciones',
    label: 'Acciones',
    align: 'center',
    width: '120px',
    render: (_, item) => (
      <ButtonGroup size="sm">
        {onView && (
          <Button variant="outline-info" onClick={() => onView(item)} title="Ver">
            <i className="bi bi-eye"></i>
          </Button>
        )}
        {onEdit && (
          <Button variant="outline-warning" onClick={() => onEdit(item)} title="Editar">
            <i className="bi bi-pencil"></i>
          </Button>
        )}
        {onDelete && (
          <Button variant="outline-danger" onClick={() => onDelete(item)} title="Eliminar">
            <i className="bi bi-trash"></i>
          </Button>
        )}
      </ButtonGroup>
    )
  };

  const allColumns = showActions && (onEdit || onDelete || onView) 
    ? [...columns, actionColumn] 
    : columns;

  return (
    <div className="border rounded bg-white">
      {/* Header con título y botones */}
      {(title || onAdd || searchable) && (
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light flex-wrap gap-2">
          {title && <h5 className="mb-0 fw-bold">{title}</h5>}
          
          <div className="d-flex gap-2">
            {searchable && (
              <Form.Control
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: '250px' }}
              />
            )}
            {onAdd && (
              <Button variant="primary" size="sm" onClick={onAdd}>
                <i className="bi bi-plus-lg me-1"></i>
                {addButtonText}
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Tabla */}
      <div className="table-responsive">
        <Table striped hover className="mb-0">
          <thead className="bg-light">
            <tr>
              {allColumns.map((col, idx) => (
                <th 
                  key={col.key} 
                  className={`${idx === 0 ? 'ps-3' : ''} ${idx === allColumns.length - 1 ? 'pe-3' : ''} py-3`}
                  style={{ textAlign: col.align || 'left', width: col.width }}
                >
                  <div className="d-flex align-items-center gap-1">
                    {col.label}
                    {col.sortable !== false && (
                      <button 
                        className="btn btn-sm p-0 border-0 bg-transparent"
                        onClick={() => handleSort(col.key)}
                      >
                        {sortColumn === col.key ? (
                          <i className={`bi bi-arrow-${sortDirection === 'asc' ? 'up' : 'down'}`}></i>
                        ) : (
                          <i className="bi bi-arrow-down-up"></i>
                        )}
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
          {paginatedData.length > 0 ? (
            paginatedData.map((item, idx) => (
              <tr 
                key={idx}
                onClick={() => onRowClick?.(item)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {allColumns.map((col, colIdx) => (
                  <td 
                    key={col.key} 
                    className={`${colIdx === 0 ? 'ps-3' : ''} ${colIdx === allColumns.length - 1 ? 'pe-3' : ''}`}
                    style={{ textAlign: col.align || 'left' }}
                  >
                    {col.render ? col.render(item[col.key], item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={allColumns.length} className="text-center py-4 text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
        </Table>
      </div>
      
      {/* Footer con paginación */}
      {sortedData.length > 0 && (
        <div className="d-flex justify-content-between align-items-center p-3 border-top bg-light flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted text-sm">
              Mostrando {((currentPage - 1) * rowsPerPage) + 1} - {Math.min(currentPage * rowsPerPage, sortedData.length)} de {sortedData.length}
            </span>
            {showPageSizeSelector && (
              <>
                <span className="text-muted">|</span>
                <Form.Select 
                  size="sm" 
                  value={rowsPerPage} 
                  onChange={handleRowsPerPageChange}
                  style={{ width: '70px' }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </Form.Select>
                <span className="text-muted text-sm">por página</span>
              </>
            )}
          </div>
          
          {totalPages > 1 && (
            <Pagination size="sm" className="mb-0">
              <Pagination.Prev 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              />
              {renderPaginationItems()}
              <Pagination.Next 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              />
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
}