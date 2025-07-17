import { jsx as _jsx } from "@emotion/react/jsx-runtime";
import { render } from '@testing-library/react';
import DocumentListTable from '../DocumentListTable';
describe('DocumentListTable', () => {
    it('renders without crashing', () => {
        const { container } = render(_jsx(DocumentListTable, { documents: [], selectedDocuments: [], onSelectDocument: () => { }, onSelectAllDocuments: () => { }, onSort: () => { }, sortBy: "name", sortDirection: "asc", loading: false, emptyMessage: "No documents found" }));
        expect(container).toBeInTheDocument();
    });
});
