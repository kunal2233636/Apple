import { NextRequest, NextResponse } from 'next/server';

// Default embedding provider configurations
const DEFAULT_PROVIDERS = {
  cohere: {
    name: 'Cohere',
    provider: 'cohere',
    enabled: true,
    model: 'embed-multilingual-v3.0',
    priority: 1,
    rateLimits: {
      requestsPerMinute: 100,
      requestsPerDay: 24000,
      requestsPerMonth: 720000
    },
    cost: {
      pricePerToken: 0.000001,
      dailyBudget: 50,
      monthlyBudget: 1500
    },
    health: {
      healthy: true,
      responseTime: 245,
      lastCheck: new Date().toISOString()
    },
    usage: {
      requests: 1247,
      cost: 2.45
    }
  },
  mistral: {
    name: 'Mistral AI',
    provider: 'mistral',
    enabled: true,
    model: 'mistral-embed',
    priority: 2,
    rateLimits: {
      requestsPerMinute: 60,
      requestsPerDay: 14400,
      requestsPerMonth: 432000
    },
    cost: {
      pricePerToken: 0.0000005,
      dailyBudget: 30,
      monthlyBudget: 900
    },
    health: {
      healthy: true,
      responseTime: 189,
      lastCheck: new Date().toISOString()
    },
    usage: {
      requests: 892,
      cost: 1.78
    }
  },
  google: {
    name: 'Google AI',
    provider: 'google',
    enabled: false,
    model: 'text-embedding-004',
    priority: 3,
    rateLimits: {
      requestsPerMinute: 80,
      requestsPerDay: 19200,
      requestsPerMonth: 576000
    },
    cost: {
      pricePerToken: 0.0000002,
      dailyBudget: 20,
      monthlyBudget: 600
    },
    health: {
      healthy: false,
      responseTime: 0,
      lastCheck: new Date().toISOString(),
      error: 'API key not configured'
    },
    usage: {
      requests: 0,
      cost: 0
    }
  }
};

const DEFAULT_SETTINGS = {
  providers: DEFAULT_PROVIDERS,
  defaultProvider: 'cohere',
  fallbackProviders: ['mistral', 'google'],
  models: {
    cohere: 'embed-multilingual-v3.0',
    mistral: 'mistral-embed',
    google: 'text-embedding-004'
  },
  monitoring: {
    enabled: true,
    healthCheckInterval: 5,
    alertThresholds: {
      errorRate: 5.0,
      responseTime: 2000,
      costLimit: 100.0
    }
  }
};

// In-memory storage for demo (in production, use database)
let currentSettings = { ...DEFAULT_SETTINGS };

// GET /api/admin/embeddings/settings
export async function OPTIONS() { return NextResponse.json({}, { status: 200 }); }

export async function GET(request: NextRequest) {
  try {
    // Simulate data loading delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return NextResponse.json({
      success: true,
      data: currentSettings
    });
  } catch (error) {
    console.error('Error fetching embedding settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST /api/admin/embeddings/settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, provider, config } = body;

    switch (action) {
      case 'update-provider':
        if (provider && config && provider in currentSettings.providers) {
          // Update specific provider configuration
          const providerKey = provider as keyof typeof currentSettings.providers;
          currentSettings.providers[providerKey] = {
            ...currentSettings.providers[providerKey],
            ...config
          };
        }
        break;

      case 'set-default-provider':
        if (provider && provider in currentSettings.providers) {
          const providerKey = provider as keyof typeof currentSettings.providers;
          currentSettings.defaultProvider = providerKey;
        }
        break;

      case 'test-provider':
        // Simulate provider testing
        if (provider && provider in currentSettings.providers) {
          const providerKey = provider as keyof typeof currentSettings.providers;
          // Simulate test results
          const mockHealth = {
            healthy: Math.random() > 0.1, // 90% success rate
            responseTime: Math.floor(Math.random() * 500) + 100,
            lastCheck: new Date().toISOString(),
            error: Math.random() > 0.9 ? 'Connection timeout' : undefined
          };

          currentSettings.providers[providerKey].health = mockHealth;
          
          return NextResponse.json({
            success: true,
            data: { health: mockHealth }
          });
        }
        break;

      case 'reset-usage':
        // Reset usage statistics for all providers
        Object.keys(currentSettings.providers).forEach(key => {
          const providerKey = key as keyof typeof currentSettings.providers;
          if (currentSettings.providers[providerKey].usage) {
            currentSettings.providers[providerKey].usage = {
              requests: 0,
              cost: 0
            };
          }
        });
        break;

      case 'update-monitoring':
        if (config) {
          currentSettings.monitoring = {
            ...currentSettings.monitoring,
            ...config
          };
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: currentSettings
    });

  } catch (error) {
    console.error('Error updating embedding settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
