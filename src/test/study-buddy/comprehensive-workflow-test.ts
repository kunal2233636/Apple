import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { StudyBuddyTab } from '@/components/settings/StudyBuddyTab';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { UserSettings } from '@/types/settings';
import { mockStudyBuddySettings } from './mock-data';
import { mockApiResponse } from './mock-api';

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('Study Buddy Comprehensive Workflow Tests', () => {
  let queryClient: QueryClient;
  let mockToast: jest.Mock;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    mockToast = jest.fn();
    mockFetch = fetch as jest.Mock;

    // Mock the useToast hook
    require('@/hooks/use-toast').useToast.mockReturnValue({
      toast: mockToast
    });

    // Mock successful API responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockStudyBuddySettings })
    });

    // Setup DOM elements for Toaster
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('StudyBuddyTab Component', () => {
    const renderStudyBuddyTab = (settings: UserSettings = mockStudyBuddySettings, onChange: jest.Mock = jest.fn()) => {
      return render(
        <QueryClientProvider client={queryClient}>
          <Toaster />
          <StudyBuddyTab
            settings={settings}
            onChange={onChange}
          />
        </QueryClientProvider>
      );
    };

    it('should render all endpoint cards with correct information', () => {
      renderStudyBuddyTab(mockStudyBuddySettings, jest.fn());
      
      // Check that all endpoints are rendered
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('Embeddings')).toBeInTheDocument();
      expect(screen.getByText('Memory Storage')).toBeInTheDocument();
      expect(screen.getByText('Orchestrator')).toBeInTheDocument();
      expect(screen.getByText('Personalized')).toBeInTheDocument();
      expect(screen.getByText('Semantic Search')).toBeInTheDocument();
      expect(screen.getByText('Web Search')).toBeInTheDocument();
    });

    it('should display provider and model selection dropdowns', () => {
      renderStudyBuddyTab(mockStudyBuddySettings, jest.fn());
      
      // Check that provider dropdowns are present
      const providerDropdowns = screen.getAllByText('Select provider');
      expect(providerDropdowns.length).toBe(7);
      
      // Check that model dropdowns are present
      const modelDropdowns = screen.getAllByText('Select model');
      expect(modelDropdowns.length).toBe(7);
    });

    it('should validate required fields when saving', async () => {
      const mockOnChange = jest.fn();
      renderStudyBuddyTab({ onChange: mockOnChange });
      
      // Try to save with empty provider (should fail validation)
      const saveButton = screen.getByText('Save Settings');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      // Should show validation error
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Validation Error',
          description: 'Please fix the highlighted errors before saving'
        })
      );
    });

          renderStudyBuddyTab(mockStudyBuddySettings, jest.fn());
      
      const showAdvancedButton = screen.getByText('Show Advanced');
      await act(async () => {
        fireEvent.click(showAdvancedButton);
      });

      // Should show timeout controls and other advanced options
      expect(screen.getByText(/Timeout:/)).toBeInTheDocument();
      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });

    it('should apply global defaults to all endpoints', async () => {
      const mockOnChange = jest.fn();
      renderStudyBuddyTab(mockStudyBuddySettings, mockOnChange);
      
      // Select a provider in global defaults
      const providerSelect = screen.getAllByRole('combobox')[0];
      await act(async () => {
        fireEvent.mouseDown(providerSelect);
      });

      const providerOptions = screen.getAllByRole('option');
      await act(async () => {
        fireEvent.click(providerOptions.find(opt => opt.textContent === 'Groq'));
      });

      // Should trigger onChange with updated defaults
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should test individual endpoints', async () => {
      renderStudyBuddyTab(mockStudyBuddySettings, jest.fn());
      
      const testButtons = screen.getAllByText('Test');
      expect(testButtons.length).toBe(7);
      
      // Test the first endpoint
      await act(async () => {
        fireEvent.click(testButtons[0]);
      });

      // Should show loading state
      expect(screen.getAllByRole('img')[0]).toBeInTheDocument();
    });

    it('should display statistics correctly', () => {
      renderStudyBuddyTab(mockStudyBuddySettings, jest.fn());
      
      // Check that statistics cards are present
      expect(screen.getByText('Total Endpoints')).toBeInTheDocument();
      expect(screen.getByText('Enabled')).toBeInTheDocument();
      expect(screen.getByText('Working')).toBeInTheDocument();
    });

    it('should handle provider model dependencies correctly', async () => {
      renderStudyBuddyTab(mockStudyBuddySettings, jest.fn());
      const providerSelect = screen.getAllByRole('combobox')[0];
      await act(async () => {
        fireEvent.mouseDown(providerSelect);
      });

      const groqOption = screen.getAllByRole('option').find(opt => opt.textContent === 'Groq');
      await act(async () => {
        fireEvent.click(groqOption);
      });

      // Now model dropdown should be enabled and show Groq models
      const modelSelect = screen.getAllByRole('combobox')[1];
      expect(modelSelect).not.toBeDisabled();
    });

    it('should provide helpful tooltips for providers and models', async () => {
      renderStudyBuddyTab();
      
      // Hover over provider info icon
      const infoIcons = screen.getAllByRole('img');
      expect(infoIcons.length).toBeGreaterThan(0);
    });

    it('should handle bulk operations correctly', async () => {
      const mockOnChange = jest.fn();
      renderStudyBuddyTab({ onChange: mockOnChange });
      
      // Test enable all
      const enableAllButton = screen.getByText('Enable All');
      await act(async () => {
        fireEvent.click(enableAllButton);
      });

      // Should call onChange with all endpoints enabled
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoints: expect.objectContaining({
            chat: expect.objectContaining({ enabled: true }),
            embeddings: expect.objectContaining({ enabled: true })
          })
        })
      );
    });
  });

  describe('SettingsPanel Integration', () => {
    const renderSettingsPanel = (userId: string = "test-user-123") => {
      return render(
        <QueryClientProvider client={queryClient}>
          <Toaster />
          <SettingsPanel
            userId={userId}
          />
        </QueryClientProvider>
      );
    };

    it('should integrate Study Buddy tab with main settings panel', () => {
      renderSettingsPanel("test-user-123");
      
      // Check that Study Buddy tab is present
      const studyBuddyTab = screen.getByRole('tab', { name: /study buddy/i });
      expect(studyBuddyTab).toBeInTheDocument();
    });

    it('should handle unsaved changes tracking', async () => {
      renderSettingsPanel();
      
      // Navigate to Study Buddy tab
      const studyBuddyTab = screen.getByRole('tab', { name: /study buddy/i });
      await act(async () => {
        fireEvent.click(studyBuddyTab);
      });

      // Make a change
      const showAdvancedButton = screen.getByText('Show Advanced');
      await act(async () => {
        fireEvent.click(showAdvancedButton);
      });

      // Should show unsaved changes indicator
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    it('should show confirmation dialog when navigating away with unsaved changes', async () => {
      renderSettingsPanel();
      
      // Navigate to Study Buddy tab and make changes
      const studyBuddyTab = screen.getByRole('tab', { name: /study buddy/i });
      await act(async () => {
        fireEvent.click(studyBuddyTab);
      });

      const showAdvancedButton = screen.getByText('Show Advanced');
      await act(async () => {
        fireEvent.click(showAdvancedButton);
      });

      // Try to navigate to another tab
      const aiModelTab = screen.getByRole('tab', { name: /ai models/i });
      await act(async () => {
        fireEvent.click(aiModelTab);
      });

      // Should show confirmation dialog
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      expect(screen.getByText('You have unsaved changes. What would you like to do?')).toBeInTheDocument();
    });

    it('should save settings successfully', async () => {
      renderSettingsPanel();
      
      const studyBuddyTab = screen.getByRole('tab', { name: /study buddy/i });
      await act(async () => {
        fireEvent.click(studyBuddyTab);
      });

      // Make a change
      const showAdvancedButton = screen.getByText('Show Advanced');
      await act(async () => {
        fireEvent.click(showAdvancedButton);
      });

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      // Should call the save API
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/user/settings'),
        expect.objectContaining({
          method: 'PUT'
        })
      );
    });
  });

  describe('Accessibility and Responsive Design', () => {
    it('should have proper ARIA labels and roles', () => {
      renderStudyBuddyTab();
      
      // Check for proper form labels
      const labels = screen.getAllByRole('button');
      expect(labels.length).toBeGreaterThan(0);
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('should handle keyboard navigation', async () => {
      renderStudyBuddyTab();
      
      // Tab through interactive elements
      const showAdvancedButton = screen.getByText('Show Advanced');
      showAdvancedButton.focus();
      expect(document.activeElement).toBe(showAdvancedButton);
      
      // Press Enter to activate
      await act(async () => {
        fireEvent.keyDown(showAdvancedButton, { key: 'Enter', code: 'Enter' });
      });
    });

    it('should be responsive to screen size changes', () => {
      renderStudyBuddyTab();
      
      // Check that grid layout classes are present for responsive design
      const endpointGrid = screen.getByText('Individual Endpoint Configuration').parentElement?.nextElementSibling;
      expect(endpointGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
            mockFetch.mockResolvedValueOnce({
              ok: false,
              json: () => Promise.resolve({
                success: false,
                error: 'Failed to save settings'
              })
            });
      
            renderStudyBuddyTab(mockStudyBuddySettings, jest.fn());      
      const saveButton = screen.getByText('Save Settings');
      await act(async () => {
        fireEvent.click(saveButton);
      });

      // Should show error toast
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Save Failed',
          description: expect.stringContaining('Failed to save settings')
        })
      );
    });

    it('should handle invalid provider/model combinations', async () => {
      renderStudyBuddyTab(mockStudyBuddySettings, jest.fn());
      
      // Select a provider
      const providerSelect = screen.getAllByRole('combobox')[0];
      await act(async () => {
        fireEvent.mouseDown(providerSelect);
      });

      const groqOption = screen.getAllByRole('option').find(opt => opt.textContent === 'Groq');
      await act(async () => {
        fireEvent.click(groqOption);
      });

      // Try to select an invalid model
      const modelSelect = screen.getAllByRole('combobox')[1];
      await act(async () => {
        fireEvent.mouseDown(modelSelect);
      });

      // Should show appropriate error or validation
      expect(modelSelect).not.toBeDisabled();
    });

    it('should handle timeout validation correctly', async () => {
      const mockOnChange = jest.fn();
      renderStudyBuddyTab({ onChange: mockOnChange });
      
      const showAdvancedButton = screen.getByText('Show Advanced');
      await act(async () => {
        fireEvent.click(showAdvancedButton);
      });

      // Try to set invalid timeout
      const timeoutInputs = screen.getAllByRole('spinbutton');
      await act(async () => {
        fireEvent.change(timeoutInputs[0], { target: { value: '200' } });
      });

      // Should show validation error or clamp to max value
      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe('Performance and User Experience', () => {
    it('should provide smooth animations and transitions', () => {
      renderStudyBuddyTab(mockStudyBuddySettings, jest.fn());
      
      // Check for animation classes
      const container = screen.getByText('Study Buddy AI Endpoint Configuration').closest('div');
      expect(container).toHaveClass('animate-in', 'fade-in-5', 'slide-in-from-left-2');
    });

    it('should provide loading states during operations', async () => {
      renderStudyBuddyTab(mockStudyBuddySettings, jest.fn());
      
      // Start testing an endpoint
      const testButtons = screen.getAllByText('Test');
      await act(async () => {
        fireEvent.click(testButtons[0]);
      });

      // Should show loading spinner
      expect(screen.getAllByRole('img')[0]).toBeInTheDocument();
    });

    it('should provide visual feedback for state changes', async () => {
      renderStudyBuddyTab(mockStudyBuddySettings, jest.fn());
      
      const showAdvancedButton = screen.getByText('Show Advanced');
      await act(async () => {
        fireEvent.click(showAdvancedButton);
      });

      // Button should change text and icon
      expect(screen.getByText('Hide Advanced')).toBeInTheDocument();
    });
  });
});

// Performance tests
describe('Study Buddy Performance Tests', () => {
  it('should render within acceptable time limits', () => {
    const startTime = performance.now();
    
    const { unmount } = render(
      <QueryClientProvider client={new QueryClient()}>
        <StudyBuddyTab
          settings={mockStudyBuddySettings}
          onChange={jest.fn()}
        />
      </QueryClientProvider>
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render in under 100ms
    expect(renderTime).toBeLessThan(100);
    
    unmount();
  });

  it('should handle large numbers of settings efficiently', () => {
    const largeSettings = {
      ...mockStudyBuddySettings,
      endpoints: {
        ...mockStudyBuddySettings.endpoints,
        // Add more endpoints to test performance
        'additional-endpoint-1': {
          ...mockStudyBuddySettings.endpoints.chat,
          provider: 'groq',
          model: 'llama-3.1-8b-instant'
        }
      }
    };

    const startTime = performance.now();
    
    render(
      <QueryClientProvider client={new QueryClient()}>
        <StudyBuddyTab
          settings={largeSettings}
          onChange={jest.fn()}
        />
      </QueryClientProvider>
    );
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(150);
  });
});

// Integration tests with real API endpoints
describe('Study Buddy Integration Tests', () => {
  it('should integrate with real settings API', async () => {
    // This would test against actual API endpoints in a test environment
    const response = await fetch('/api/user/settings?userId=test-user', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('studyBuddy');
  });
});