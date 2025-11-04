import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WilliMakoClient, WilliMakoError } from '../src/index.js';
import type {
  UploadDocumentResponse,
  UploadMultipleDocumentsResponse,
  ListDocumentsResponse,
  GetDocumentResponse,
  UpdateDocumentResponse,
  ToggleAiContextResponse,
  ReprocessDocumentResponse,
  Document
} from '../src/types.js';

describe('WilliMakoClient - Document Management', () => {
  let client: WilliMakoClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  const mockDocument: Document = {
    id: 'doc-123',
    user_id: 'user-456',
    title: 'Test Document',
    description: 'A test document',
    original_name: 'test.pdf',
    file_path: '/uploads/test.pdf',
    file_size: 1024,
    mime_type: 'application/pdf',
    is_processed: true,
    is_ai_context_enabled: true,
    extracted_text: 'Sample extracted text',
    extracted_text_length: 22,
    processing_error: null,
    tags: ['test', 'pdf'],
    vector_point_id: 'vec-789',
    created_at: '2025-11-04T10:00:00Z',
    updated_at: '2025-11-04T10:00:00Z'
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    client = new WilliMakoClient({
      baseUrl: 'https://test-api.example.com',
      token: 'test-token',
      fetch: mockFetch as unknown as typeof fetch
    });
  });

  describe('uploadDocument', () => {
    it('should upload a single document successfully', async () => {
      const mockResponse: UploadDocumentResponse = {
        success: true,
        data: {
          document: mockDocument,
          message: 'Document uploaded successfully'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const fileBuffer = Buffer.from('test file content');
      const response = await client.uploadDocument({
        file: fileBuffer,
        title: 'Test Document',
        description: 'A test document',
        tags: ['test', 'pdf'],
        is_ai_context_enabled: true
      });

      expect(response).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/documents/upload',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should handle upload errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 413,
        statusText: 'Payload Too Large',
        text: async () =>
          JSON.stringify({
            error: 'File size exceeds maximum limit of 50MB'
          })
      });

      const fileBuffer = Buffer.from('test file content');
      await expect(
        client.uploadDocument({
          file: fileBuffer,
          title: 'Large Document'
        })
      ).rejects.toThrow(WilliMakoError);
    });
  });

  describe('uploadMultipleDocuments', () => {
    it('should upload multiple documents successfully', async () => {
      const mockResponse: UploadMultipleDocumentsResponse = {
        success: true,
        data: {
          documents: [mockDocument, { ...mockDocument, id: 'doc-124', title: 'Document 2' }],
          message: '2 documents uploaded successfully'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const files = [Buffer.from('file 1'), Buffer.from('file 2')];
      const response = await client.uploadMultipleDocuments({
        files,
        is_ai_context_enabled: true
      });

      expect(response.data.documents).toHaveLength(2);
      expect(response.success).toBe(true);
    });

    it('should throw error when uploading more than 10 files', async () => {
      const files = Array(11).fill(Buffer.from('file'));

      await expect(
        client.uploadMultipleDocuments({
          files,
          is_ai_context_enabled: false
        })
      ).rejects.toThrow('Maximum 10 files allowed per upload');
    });
  });

  describe('listDocuments', () => {
    it('should list documents with default pagination', async () => {
      const mockResponse: ListDocumentsResponse = {
        success: true,
        data: {
          documents: [mockDocument],
          pagination: {
            page: 1,
            limit: 12,
            total: 1,
            totalPages: 1
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const response = await client.listDocuments();

      expect(response.data.documents).toHaveLength(1);
      expect(response.data.pagination.page).toBe(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/documents',
        expect.any(Object)
      );
    });

    it('should list documents with custom pagination and search', async () => {
      const mockResponse: ListDocumentsResponse = {
        success: true,
        data: {
          documents: [mockDocument],
          pagination: {
            page: 2,
            limit: 20,
            total: 25,
            totalPages: 2
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const response = await client.listDocuments({
        page: 2,
        limit: 20,
        search: 'test',
        processed: true
      });

      expect(response.data.pagination.page).toBe(2);
      expect(response.data.pagination.limit).toBe(20);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/documents?page=2&limit=20&search=test&processed=true',
        expect.any(Object)
      );
    });
  });

  describe('getDocument', () => {
    it('should retrieve a single document', async () => {
      const mockResponse: GetDocumentResponse = {
        success: true,
        data: mockDocument
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const response = await client.getDocument('doc-123');

      expect(response.data.id).toBe('doc-123');
      expect(response.data.title).toBe('Test Document');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/documents/doc-123',
        expect.any(Object)
      );
    });

    it('should handle document not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () =>
          JSON.stringify({
            error: 'Document not found'
          })
      });

      await expect(client.getDocument('nonexistent')).rejects.toThrow(WilliMakoError);
    });
  });

  describe('updateDocument', () => {
    it('should update document metadata', async () => {
      const updatedDocument = {
        ...mockDocument,
        title: 'Updated Title',
        description: 'Updated description',
        tags: ['updated', 'test']
      };

      const mockResponse: UpdateDocumentResponse = {
        success: true,
        data: updatedDocument
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const response = await client.updateDocument('doc-123', {
        title: 'Updated Title',
        description: 'Updated description',
        tags: ['updated', 'test']
      });

      expect(response.data.title).toBe('Updated Title');
      expect(response.data.description).toBe('Updated description');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/documents/doc-123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            title: 'Updated Title',
            description: 'Updated description',
            tags: ['updated', 'test']
          })
        })
      );
    });

    it('should update AI context setting', async () => {
      const updatedDocument = {
        ...mockDocument,
        is_ai_context_enabled: false
      };

      const mockResponse: UpdateDocumentResponse = {
        success: true,
        data: updatedDocument
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const response = await client.updateDocument('doc-123', {
        is_ai_context_enabled: false
      });

      expect(response.data.is_ai_context_enabled).toBe(false);
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: async () => ''
      });

      await expect(client.deleteDocument('doc-123')).resolves.toBeUndefined();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/documents/doc-123',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('should handle delete errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () =>
          JSON.stringify({
            error: 'Document not found'
          })
      });

      await expect(client.deleteDocument('nonexistent')).rejects.toThrow(WilliMakoError);
    });
  });

  describe('downloadDocument', () => {
    it('should download document file', async () => {
      const fileContent = new ArrayBuffer(1024);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => fileContent
      });

      const response = await client.downloadDocument('doc-123');

      expect(response).toBe(fileContent);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/documents/doc-123/download',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should handle download errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () =>
          JSON.stringify({
            error: 'Document not found'
          })
      });

      await expect(client.downloadDocument('nonexistent')).rejects.toThrow(WilliMakoError);
    });
  });

  describe('reprocessDocument', () => {
    it('should trigger reprocessing', async () => {
      const mockResponse: ReprocessDocumentResponse = {
        success: true,
        data: {
          message: 'Reprocessing started'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const response = await client.reprocessDocument('doc-123');

      expect(response.data.message).toBe('Reprocessing started');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/documents/doc-123/reprocess',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('toggleAiContext', () => {
    it('should enable AI context', async () => {
      const updatedDocument = {
        ...mockDocument,
        is_ai_context_enabled: true
      };

      const mockResponse: ToggleAiContextResponse = {
        success: true,
        data: updatedDocument
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const response = await client.toggleAiContext('doc-123', true);

      expect(response.data.is_ai_context_enabled).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.example.com/documents/doc-123/ai-context',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ enabled: true })
        })
      );
    });

    it('should disable AI context', async () => {
      const updatedDocument = {
        ...mockDocument,
        is_ai_context_enabled: false
      };

      const mockResponse: ToggleAiContextResponse = {
        success: true,
        data: updatedDocument
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const response = await client.toggleAiContext('doc-123', false);

      expect(response.data.is_ai_context_enabled).toBe(false);
    });
  });
});
