"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  BarChart3, 
  Users, 
  Settings, 
  Eye,
  CheckCircle2,
  AlertTriangle,
  Info,
  Zap,
  Brain,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useHallucinationPrevention } from '@/contexts/HallucinationPreventionContext';
import { EnhancedLayerStatus } from './EnhancedLayerStatus';
import QualityMetricsDisplay from './QualityMetricsDisplay';
import ConfidenceRiskIndicators from './ConfidenceRiskIndicators';
import SystemHealthDashboard from './SystemHealthDashboard';
import LearningInsightsPanel from './LearningInsightsPanel';
import UserFeedbackCollection from './UserFeedbackCollection';
import { QualityMetrics } from '@/contexts/HallucinationPreventionContext';
import { cn } from '@/lib/utils';

interface QualityAssurancePanelProps {
  className?: string;
  showFullPanel?: boolean;
  showExpandedView?: boolean;
  currentResponse?: {
    id: string;
    text: string;
    qualityScore?: number;
    confidence?: number;
    hallucinationRisk?: 'low' | 'medium' | 'high';
    factCheckStatus?: 'verified' | 'unverified' | 'disputed';
  };
  onResponseFeedback?: (feedback: any) => void;
}

export const QualityAssurancePanel: React.FC<QualityAssurancePanelProps> = ({
  className,
  showFullPanel = true,
  showExpandedView = false,
  currentResponse,
  onResponseFeedback,
}) => {
  const { state } = useHallucinationPrevention();
  const [activeTab, setActiveTab] = useState('overview');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [preferences, setPreferences] = useState({
    showLayerStatus: true,
    showQualityScores: true,
    showLearningInsights: true,
    showSystemHealth: true,
    autoRefresh: true,
  });

  const qualityMetrics: QualityMetrics | null = state.qualityMetrics;
  const isProcessing = state.isProcessing;
  const layerStatuses = state.layerStatuses;

  // Mock data for demonstration when no current response is provided
  const mockQualityMetrics: QualityMetrics = {
    overall: 0.87,
    factual: 0.92,
    logical: 0.85,
    complete: 0.88,
    consistent: 0.91,
    confidence: 0.89,
    hallucinationRisk: 'low',
    factCheckStatus: 'verified',
    educationalEffectiveness: 0.85,
    userSatisfaction: 4.2,
  };

  const currentQualityMetrics = currentResponse?.qualityScore 
    ? { ...mockQualityMetrics, overall: currentResponse.qualityScore }
    : qualityMetrics || mockQualityMetrics;

  const currentConfidence = currentResponse?.confidence || currentQualityMetrics.confidence;
  const currentRisk = currentResponse?.hallucinationRisk || currentQualityMetrics.hallucinationRisk;
  const currentFactStatus = currentResponse?.factCheckStatus || currentQualityMetrics.factCheckStatus;

  const handleSubmitFeedback = (feedback: any) => {
    if (onResponseFeedback) {
      onResponseFeedback(feedback);
    }
  };

  const openFeedbackModal = () => {
    if (currentResponse) {
      setShowFeedbackModal(true);
    }
  };

  if (showFullPanel) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Header with Toggle Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <h2 className="font-semibold">5-Layer Quality Assurance</h2>
            {isProcessing && (
              <Badge variant="outline" className="text-xs">
                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                Processing
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={openFeedbackModal}
              disabled={!currentResponse}
              className="text-xs"
            >
              <Users className="h-3 w-3 mr-1" />
              Provide Feedback
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              <Settings className="h-3 w-3 mr-1" />
              Settings
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="processing" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              Processing
            </TabsTrigger>
            <TabsTrigger value="quality" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Quality
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">
              <Brain className="h-3 w-3 mr-1" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="system" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Real-time Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Current Status
                </h3>
                
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Quality</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(currentQualityMetrics.overall * 100)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isProcessing ? "Processing through validation layers..." : "Ready for analysis"}
                  </div>
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Hallucination Risk</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        currentRisk === 'low' && "border-green-300 text-green-700",
                        currentRisk === 'medium' && "border-yellow-300 text-yellow-700",
                        currentRisk === 'high' && "border-red-300 text-red-700"
                      )}
                    >
                      {currentRisk?.toUpperCase() || 'LOW'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {currentRisk === 'low' && "High confidence in accuracy"}
                    {currentRisk === 'medium' && "Moderate risk detected"}
                    {currentRisk === 'high' && "High risk - verification needed"}
                  </div>
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Fact Verification</span>
                    <Badge variant="outline" className="text-xs">
                      {currentFactStatus?.toUpperCase() || 'VERIFIED'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {currentFactStatus === 'verified' && "All facts confirmed"}
                    {currentFactStatus === 'unverified' && "Some facts need verification"}
                    {currentFactStatus === 'disputed' && "Conflicting information found"}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  Quick Actions
                </h3>
                
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={openFeedbackModal}
                    disabled={!currentResponse}
                  >
                    <Users className="h-3 w-3 mr-2" />
                    Rate this Response
                  </Button>
                  
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Info className="h-3 w-3 mr-2" />
                    View Detailed Analysis
                  </Button>
                  
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <BarChart3 className="h-3 w-3 mr-2" />
                    Download Report
                  </Button>
                  
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Settings className="h-3 w-3 mr-2" />
                    Adjust Preferences
                  </Button>
                </div>
              </div>
            </div>

            {/* Layer Status Summary */}
            {preferences.showLayerStatus && (
              <div>
                <h3 className="text-sm font-medium mb-2">Layer Processing Status</h3>
                <LayerStatusIndicators compact showDetails={false} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="processing" className="space-y-4">
            <EnhancedLayerStatus status={state} />
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <QualityMetricsDisplay 
                metrics={currentQualityMetrics} 
                showEducationalEffectiveness 
              />
              <ConfidenceRiskIndicators
                confidence={currentConfidence}
                hallucinationRisk={currentRisk}
                factCheckStatus={currentFactStatus}
                showDetailedBreakdown
                interactive
              />
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <LearningInsightsPanel showDetailed />
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <SystemHealthDashboard />
          </TabsContent>
        </Tabs>

        {/* User Feedback Modal */}
        {currentResponse && (
          <UserFeedbackCollection
            responseId={currentResponse.id}
            responseText={currentResponse.text}
            qualityScore={currentQualityMetrics.overall}
            onSubmit={handleSubmitFeedback}
            onClose={() => setShowFeedbackModal(false)}
            isOpen={showFeedbackModal}
          />
        )}
      </div>
    );
  }

  // Compact view for integration into existing components
  return (
    <div className={cn("space-y-3", className)}>
      {/* Quick Status Indicators */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Quality: {Math.round(currentQualityMetrics.overall * 100)}%
        </Badge>
        
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            currentRisk === 'low' && "border-green-300 text-green-700",
            currentRisk === 'medium' && "border-yellow-300 text-yellow-700",
            currentRisk === 'high' && "border-red-300 text-red-700"
          )}
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          {currentRisk?.toUpperCase()} Risk
        </Badge>
        
        <Badge variant="outline" className="text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {currentFactStatus?.toUpperCase()}
        </Badge>
      </div>

      {/* Compact Layer Status */}
      <LayerStatusIndicators compact />

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={openFeedbackModal}
          disabled={!currentResponse}
          className="text-xs"
        >
          <Users className="h-3 w-3 mr-1" />
          Rate
        </Button>
        
        <Button variant="ghost" size="sm" className="text-xs">
          <Info className="h-3 w-3 mr-1" />
          Details
        </Button>
      </div>

      {/* Feedback Modal */}
      {currentResponse && (
        <UserFeedbackCollection
          responseId={currentResponse.id}
          responseText={currentResponse.text}
          qualityScore={currentQualityMetrics.overall}
          onSubmit={handleSubmitFeedback}
          onClose={() => setShowFeedbackModal(false)}
          isOpen={showFeedbackModal}
        />
      )}
    </div>
  );
};

export default QualityAssurancePanel;