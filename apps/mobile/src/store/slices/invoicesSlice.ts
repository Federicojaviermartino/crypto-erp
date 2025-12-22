import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../api/client';

/**
 * Invoices Slice
 * Manages invoice state and actions
 */

interface Invoice {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  currency: string;
  contact: {
    id: string;
    name: string;
  };
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
  }>;
}

interface InvoicesState {
  invoices: Invoice[];
  currentInvoice: Invoice | null;
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const initialState: InvoicesState = {
  invoices: [],
  currentInvoice: null,
  isLoading: false,
  isCreating: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
};

// Async Thunks

export const fetchInvoices = createAsyncThunk(
  'invoices/fetchInvoices',
  async (
    params: {
      page?: number;
      limit?: number;
      status?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.status) queryParams.append('status', params.status);

      const response = await apiClient.get(`/invoices?${queryParams.toString()}`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch invoices');
    }
  },
);

export const fetchInvoiceById = createAsyncThunk(
  'invoices/fetchInvoiceById',
  async (invoiceId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`/invoices/${invoiceId}`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch invoice');
    }
  },
);

export const createInvoice = createAsyncThunk(
  'invoices/createInvoice',
  async (invoiceData: Partial<Invoice>, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/invoices', invoiceData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create invoice');
    }
  },
);

export const updateInvoice = createAsyncThunk(
  'invoices/updateInvoice',
  async ({ id, data }: { id: string; data: Partial<Invoice> }, { rejectWithValue }) => {
    try {
      const response = await apiClient.put(`/invoices/${id}`, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update invoice');
    }
  },
);

export const deleteInvoice = createAsyncThunk(
  'invoices/deleteInvoice',
  async (invoiceId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/invoices/${invoiceId}`);
      return invoiceId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete invoice');
    }
  },
);

export const sendInvoice = createAsyncThunk(
  'invoices/sendInvoice',
  async (invoiceId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.post(`/invoices/${invoiceId}/send`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send invoice');
    }
  },
);

// Slice

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    clearCurrentInvoice: (state) => {
      state.currentInvoice = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Invoices
    builder.addCase(fetchInvoices.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchInvoices.fulfilled, (state, action) => {
      state.isLoading = false;
      state.invoices = action.payload.data;
      state.pagination = {
        page: action.payload.page,
        limit: action.payload.limit,
        total: action.payload.total,
      };
    });
    builder.addCase(fetchInvoices.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Invoice By ID
    builder.addCase(fetchInvoiceById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchInvoiceById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentInvoice = action.payload;
    });
    builder.addCase(fetchInvoiceById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create Invoice
    builder.addCase(createInvoice.pending, (state) => {
      state.isCreating = true;
      state.error = null;
    });
    builder.addCase(createInvoice.fulfilled, (state, action) => {
      state.isCreating = false;
      state.invoices.unshift(action.payload);
      state.currentInvoice = action.payload;
    });
    builder.addCase(createInvoice.rejected, (state, action) => {
      state.isCreating = false;
      state.error = action.payload as string;
    });

    // Update Invoice
    builder.addCase(updateInvoice.fulfilled, (state, action) => {
      const index = state.invoices.findIndex((inv) => inv.id === action.payload.id);
      if (index !== -1) {
        state.invoices[index] = action.payload;
      }
      if (state.currentInvoice?.id === action.payload.id) {
        state.currentInvoice = action.payload;
      }
    });

    // Delete Invoice
    builder.addCase(deleteInvoice.fulfilled, (state, action) => {
      state.invoices = state.invoices.filter((inv) => inv.id !== action.payload);
      if (state.currentInvoice?.id === action.payload) {
        state.currentInvoice = null;
      }
    });

    // Send Invoice
    builder.addCase(sendInvoice.fulfilled, (state, action) => {
      const index = state.invoices.findIndex((inv) => inv.id === action.payload.id);
      if (index !== -1) {
        state.invoices[index] = action.payload;
      }
      if (state.currentInvoice?.id === action.payload.id) {
        state.currentInvoice = action.payload;
      }
    });
  },
});

export const { clearCurrentInvoice, clearError } = invoicesSlice.actions;
export default invoicesSlice.reducer;
