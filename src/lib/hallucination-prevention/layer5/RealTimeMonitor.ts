// Layer 5: System Orchestration & Monitoring
// ==========================================
// RealTimeMonitor - Continuous system monitoring and health management

import { supabase } from '@/lib/supabase';
import { logError, logWarning, logInfo } from '@/lib/error-logger-server-safe';

export type MonitorStatus = 'stopped' | 'starting' | 'running' | 'paused' | 'error' | 'maintenance';
export type MonitorType = 'system' | 'performance' | 'security' | 'quality' | 'business' | 'compliance' | 'custom';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical' | 'emergency';
export type MetricType = 'gauge' | 'counter' | 'histogram' | 'summary' | 'rate';

export interface MonitoringConfiguration {
  enabled: boolean;
  interval: number;
  retention: number;
  sampling: number;
  buffering: BufferingConfiguration;
  storage: StorageConfiguration;
  alerts: AlertConfiguration;
  dashboard: DashboardConfiguration;
  privacy: PrivacyConfiguration;
  security: SecurityConfiguration;
}

export interface BufferingConfiguration {
  enabled: boolean;
  size: number;
  flushInterval: number;
  compression: boolean;
  priority: 'latency' | 'throughput' | 'reliability';
  strategy: 'batch' | 'stream' | 'hybrid';
  backpressure: BackpressureConfiguration;
}

export interface BackpressureConfiguration {
  enabled: boolean;
  threshold: number;
  strategy: 'drop' | 'queue' | 'compress' | 'block';
  maxQueueSize: number;
  queueStrategy: 'fifo' | 'lifo' | 'priority';
}

export interface StorageConfiguration {
  type: 'memory' | 'database' | 'files' | 'external' | 'hybrid';
  retention: number;
  compression: boolean;
  encryption: boolean;
  partitioning: PartitioningConfiguration;
  archival: ArchivalConfiguration;
}

export interface PartitioningConfiguration {
  enabled: boolean;
  strategy: 'time' | 'size' | 'domain' | 'custom';
  interval: string;
  size: number;
  custom: string;
}

export interface ArchivalConfiguration {
  enabled: boolean;
  strategy: 'automatic' | 'manual' | 'threshold';
  threshold: number;
  destination: string;
  compression: boolean;
  retention: number;
}

export interface AlertConfiguration {
  enabled: boolean;
  channels: AlertChannel[];
  rules: AlertRule[];
  escalation: EscalationConfiguration;
  suppression: SuppressionConfiguration;
  aggregation: AlertAggregationConfiguration;
  routing: AlertRoutingConfiguration;
}

export interface AlertChannel {
  id: string;
  type: 'email' | 'sms' | 'webhook' | 'slack' | 'discord' | 'pagerduty' | 'custom';
  name: string;
  configuration: Record<string, any>;
  enabled: boolean;
  priority: number;
  filters: AlertFilter[];
}

export interface AlertFilter {
  field: string;
  operator: string;
  value: any;
  enabled: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: 'threshold' | 'anomaly' | 'pattern' | 'correlation' | 'custom';
  severity: AlertSeverity;
  condition: string;
  metrics: string[];
  threshold: ThresholdConfiguration;
  duration: number;
  enabled: boolean;
  tags: string[];
  actions: AlertAction[];
}

export interface ThresholdConfiguration {
  type: 'static' | 'dynamic' | 'relative' | 'adaptive';
  value: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq';
  comparison: 'absolute' | 'relative' | 'percentage';
  baseline: string;
  window: number;
}

export interface AlertAction {
  type: 'notify' | 'escalate' | 'remediate' | 'isolate' | 'scale' | 'custom';
  configuration: Record<string, any>;
  priority: number;
  timeout: number;
  retry: RetryConfiguration;
}

export interface RetryConfiguration {
  enabled: boolean;
  attempts: number;
  delay: number;
  backoff: 'linear' | 'exponential' | 'fixed';
  maxDelay: number;
}

export interface EscalationConfiguration {
  enabled: boolean;
  levels: EscalationLevel[];
  delay: number;
  maxLevel: number;
  conditions: EscalationCondition[];
}

export interface EscalationLevel {
  level: number;
  delay: number;
  channels: string[];
  recipients: string[];
  conditions: string[];
  actions: EscalationAction[];
}

export interface EscalationCondition {
  metric: string;
  operator: string;
  value: any;
  duration: number;
}

export interface EscalationAction {
  type: string;
  parameters: Record<string, any>;
  timeout: number;
}

export interface SuppressionConfiguration {
  enabled: boolean;
  rules: SuppressionRule[];
  timeWindow: number;
  maxSuppressions: number;
  strategy: 'time_based' | 'count_based' | 'pattern_based' | 'adaptive';
}

export interface SuppressionRule {
  id: string;
  name: string;
  condition: string;
  duration: number;
  reason: string;
  priority: number;
  scope: 'global' | 'group' | 'individual';
  enabled: boolean;
}

export interface AlertAggregationConfiguration {
  enabled: boolean;
  window: number;
  threshold: number;
  strategy: 'count' | 'rate' | 'pattern' | 'severity';
  groupBy: string[];
  deduplication: boolean;
}

export interface AlertRoutingConfiguration {
  enabled: boolean;
  rules: AlertRoutingRule[];
  loadBalancing: LoadBalancingConfiguration;
  failover: FailoverConfiguration;
}

export interface AlertRoutingRule {
  name: string;
  condition: string;
  destination: string;
  priority: number;
  enabled: boolean;
  transformation: AlertTransformation;
}

export interface AlertTransformation {
  enabled: boolean;
  format: string;
  template: string;
  fields: Record<string, string>;
  enrichment: AlertEnrichment;
}

export interface AlertEnrichment {
  enabled: boolean;
  sources: string[];
  fields: string[];
  cache: boolean;
  timeout: number;
}

export interface LoadBalancingConfiguration {
  enabled: boolean;
  algorithm: 'round_robin' | 'weighted' | 'least_connections' | 'custom';
  healthCheck: boolean;
  weight: Record<string, number>;
}

export interface FailoverConfiguration {
  enabled: boolean;
  primary: string[];
  secondary: string[];
  healthCheck: boolean;
  timeout: number;
  retryAttempts: number;
}

export interface DashboardConfiguration {
  enabled: boolean;
  type: 'realtime' | 'historical' | 'comparative' | 'predictive';
  refreshRate: number;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  permissions: PermissionConfiguration;
  export: ExportConfiguration;
  sharing: SharingConfiguration;
}

export interface DashboardLayout {
  type: 'grid' | 'flex' | 'absolute' | 'responsive';
  columns: number;
  rows: number;
  gap: number;
  responsive: boolean;
  theme: string;
  customCSS: string;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'gauge' | 'table' | 'metric' | 'map' | 'custom';
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  configuration: WidgetConfiguration;
  dataSource: WidgetDataSource;
  interaction: WidgetInteraction;
  visualization: WidgetVisualization;
  permissions: string[];
  filters: WidgetFilter[];
}

export interface WidgetPosition {
  x: number;
  y: number;
  zIndex: number;
  anchor: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center';
}

export interface WidgetSize {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  autoSize: boolean;
}

export interface WidgetConfiguration {
  refreshRate: number;
  timeout: number;
  caching: boolean;
  realtime: boolean;
  animation: AnimationConfiguration;
  accessibility: AccessibilityConfiguration;
}

export interface AnimationConfiguration {
  enabled: boolean;
  duration: number;
  easing: string;
  type: 'fade' | 'slide' | 'bounce' | 'custom';
}

export interface AccessibilityConfiguration {
  enabled: boolean;
  alt: string;
  ariaLabel: string;
  keyboard: boolean;
  screenReader: boolean;
}

export interface WidgetDataSource {
  type: 'direct' | 'api' | 'database' | 'stream' | 'external';
  configuration: Record<string, any>;
  query: string;
  parameters: Record<string, any>;
  transformation: DataTransformation;
  caching: CachingConfiguration;
  authentication: AuthenticationConfiguration;
}

export interface DataTransformation {
  enabled: boolean;
  steps: TransformationStep[];
  order: number[];
  condition: string;
}

export interface TransformationStep {
  name: string;
  type: 'filter' | 'sort' | 'aggregate' | 'map' | 'reduce' | 'custom';
  parameters: Record<string, any>;
  order: number;
  condition: string;
}

export interface CachingConfiguration {
  enabled: boolean;
  ttl: number;
  strategy: 'lru' | 'lfu' | 'ttl' | 'adaptive';
  size: number;
  invalidation: InvalidationConfiguration;
}

export interface InvalidationConfiguration {
  strategy: 'manual' | 'time' | 'event' | 'pattern';
  conditions: string[];
  events: string[];
}

export interface AuthenticationConfiguration {
  type: 'none' | 'basic' | 'oauth' | 'api_key' | 'custom';
  credentials: Record<string, any>;
  timeout: number;
  retry: RetryConfiguration;
}

export interface WidgetInteraction {
  enabled: boolean;
  click: ClickConfiguration;
  hover: HoverConfiguration;
  drag: DragConfiguration;
  zoom: ZoomConfiguration;
  selection: SelectionConfiguration;
}

export interface ClickConfiguration {
  enabled: boolean;
  action: 'navigate' | 'filter' | 'drill_down' | 'custom';
  target: string;
  parameters: Record<string, any>;
}

export interface HoverConfiguration {
  enabled: boolean;
  showTooltip: boolean;
  delay: number;
  content: string;
  position: string;
}

export interface DragConfiguration {
  enabled: boolean;
  axis: 'both' | 'x' | 'y' | 'none';
  bounds: string;
  snap: boolean;
}

export interface ZoomConfiguration {
  enabled: boolean;
  type: 'wheel' | 'click' | 'pinch' | 'range';
  factor: number;
  minZoom: number;
  maxZoom: number;
}

export interface SelectionConfiguration {
  enabled: boolean;
  type: 'single' | 'multiple' | 'range';
  color: string;
  action: 'filter' | 'highlight' | 'custom';
}

export interface WidgetVisualization {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'gauge' | 'custom';
  colors: string[];
  theme: string;
  animation: boolean;
  interactivity: boolean;
  accessibility: boolean;
  export: ExportOptions;
}

export interface ExportOptions {
  enabled: boolean;
  formats: string[];
  quality: number;
  size: string;
  background: string;
  includeMetadata: boolean;
}

export interface WidgetFilter {
  field: string;
  operator: string;
  value: any;
  type: 'static' | 'dynamic' | 'user_input' | 'context';
  enabled: boolean;
  required: boolean;
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'global' | 'widget_specific' | 'data_source';
  field: string;
  operator: string;
  value: any;
  widgets: string[];
  enabled: boolean;
}

export interface PermissionConfiguration {
  view: string[];
  edit: string[];
  admin: string[];
  export: string[];
  share: boolean;
  anonymous: boolean;
}

export interface ExportConfiguration {
  enabled: boolean;
  formats: string[];
  quality: 'draft' | 'standard' | 'high' | 'maximum';
  size: 'small' | 'medium' | 'large' | 'custom';
  background: 'transparent' | 'white' | 'black' | 'custom';
  watermark: boolean;
  metadata: boolean;
}

export interface SharingConfiguration {
  enabled: boolean;
  type: 'public' | 'private' | 'link' | 'embedded';
  permissions: string[];
  expiration: string;
  password: boolean;
  tracking: boolean;
}

export interface PrivacyConfiguration {
  enabled: boolean;
  anonymization: AnonymizationConfiguration;
  piiHandling: PIIHandlingConfiguration;
  retention: PrivacyRetentionConfiguration;
  consent: ConsentConfiguration;
  gdpr: GDPRConfiguration;
}

export interface AnonymizationConfiguration {
  enabled: boolean;
  fields: string[];
  method: 'mask' | 'hash' | 'generalize' | 'remove';
  strength: 'light' | 'medium' | 'strong';
  reversible: boolean;
}

export interface PIIHandlingConfiguration {
  enabled: boolean;
  detection: boolean;
  handling: 'mask' | 'remove' | 'encrypt' | 'anonymize';
  fields: string[];
  classification: 'pii' | 'sensitive' | 'public';
}

export interface PrivacyRetentionConfiguration {
  enabled: boolean;
  default: number;
  extended: number;
  deletion: 'automatic' | 'manual' | 'scheduled';
  archival: boolean;
}

export interface ConsentConfiguration {
  enabled: boolean;
  types: ConsentType[];
  collection: 'explicit' | 'implicit' | 'opt_in' | 'opt_out';
  management: 'self_service' | 'admin' | 'automated';
}

export interface ConsentType {
  name: string;
  description: string;
  required: boolean;
  retention: number;
}

export interface GDPRConfiguration {
  enabled: boolean;
  rightToAccess: boolean;
  rightToRectification: boolean;
  rightToErasure: boolean;
  rightToPortability: boolean;
  dataProtectionOfficer: string;
  lawfulBasis: string;
}

export interface SecurityConfiguration {
  enabled: boolean;
  authentication: SecurityAuthentication;
  authorization: SecurityAuthorization;
  encryption: SecurityEncryption;
  audit: SecurityAudit;
  compliance: SecurityCompliance;
  incidentResponse: IncidentResponseConfiguration;
}

export interface SecurityAuthentication {
  enabled: boolean;
  methods: string[];
  multiFactor: boolean;
  sessionTimeout: number;
  passwordPolicy: PasswordPolicy;
  lockout: LockoutConfiguration;
}

export interface PasswordPolicy {
  enabled: boolean;
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecial: boolean;
  history: number;
  expiry: number;
}

export interface LockoutConfiguration {
  enabled: boolean;
  attempts: number;
  duration: number;
  progressive: boolean;
}

export interface SecurityAuthorization {
  enabled: boolean;
  model: 'rbac' | 'abac' | 'custom';
  roles: string[];
  permissions: string[];
  policies: string[];
}

export interface SecurityEncryption {
  enabled: boolean;
  atRest: boolean;
  inTransit: boolean;
  algorithm: string;
  keyManagement: KeyManagementConfiguration;
}

export interface KeyManagementConfiguration {
  provider: string;
  rotation: number;
  backup: boolean;
  access: string[];
}

export interface SecurityAudit {
  enabled: boolean;
  level: 'basic' | 'standard' | 'comprehensive';
  retention: number;
  encryption: boolean;
  tamperProof: boolean;
}

export interface SecurityCompliance {
  frameworks: string[];
  standards: string[];
  certifications: string[];
  reporting: boolean;
}

export interface IncidentResponseConfiguration {
  enabled: boolean;
  procedures: IncidentProcedure[];
  notification: IncidentNotification;
  escalation: IncidentEscalation;
  recovery: IncidentRecovery;
}

export interface IncidentProcedure {
  id: string;
  name: string;
  description: string;
  steps: IncidentStep[];
  triggers: string[];
  timeout: number;
  enabled: boolean;
}

export interface IncidentStep {
  id: string;
  name: string;
  description: string;
  action: string;
  parameters: Record<string, any>;
  timeout: number;
  retry: RetryConfiguration;
}

export interface IncidentNotification {
  channels: string[];
  recipients: string[];
  template: string;
  escalation: boolean;
}

export interface IncidentEscalation {
  enabled: boolean;
  levels: number;
  delay: number;
  automatic: boolean;
}

export interface IncidentRecovery {
  enabled: boolean;
  procedures: string[];
  testing: boolean;
  documentation: boolean;
}

export interface MonitoredSystem {
  id: string;
  name: string;
  type: MonitorType;
  status: MonitorStatus;
  health: SystemHealth;
  metrics: SystemMetrics;
  configuration: MonitoringConfiguration;
  dependencies: SystemDependency[];
  performance: SystemPerformance;
  reliability: SystemReliability;
  security: SystemSecurity;
  compliance: SystemCompliance;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  components: ComponentHealth[];
  dependencies: DependencyHealth;
  lastCheck: Date;
  uptime: number;
  responseTime: number;
  errorRate: number;
}

export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  health: number;
  lastCheck: Date;
  responseTime: number;
  errorCount: number;
  warnings: string[];
}

export interface DependencyHealth {
  database: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  cache: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  queue: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  external: Record<string, 'healthy' | 'degraded' | 'unhealthy' | 'critical'>;
}

export interface SystemMetrics {
  system: SystemMetricData;
  performance: PerformanceMetricData;
  business: BusinessMetricData;
  custom: CustomMetricData[];
  realTime: RealTimeMetricData;
  historical: HistoricalMetricData;
}

export interface SystemMetricData {
  cpu: MetricValue;
  memory: MetricValue;
  disk: MetricValue;
  network: MetricValue;
  load: MetricValue;
  processes: MetricValue;
  connections: MetricValue;
  uptime: MetricValue;
}

export interface PerformanceMetricData {
  responseTime: MetricValue;
  throughput: MetricValue;
  latency: MetricValue;
  errorRate: MetricValue;
  availability: MetricValue;
  scalability: MetricValue;
  efficiency: MetricValue;
  optimization: MetricValue;
}

export interface BusinessMetricData {
  userSatisfaction: MetricValue;
  conversionRate: MetricValue;
  revenue: MetricValue;
  cost: MetricValue;
  efficiency: MetricValue;
  quality: MetricValue;
  growth: MetricValue;
  retention: MetricValue;
}

export interface CustomMetricData {
  name: string;
  value: MetricValue;
  unit: string;
  type: MetricType;
  tags: Record<string, string>;
  description: string;
}

export interface RealTimeMetricData {
  current: Record<string, number>;
  trends: Record<string, TrendData>;
  alerts: Record<string, AlertStatus>;
  anomalies: AnomalyData[];
  predictions: PredictionData[];
}

export interface TrendData {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  strength: number;
  confidence: number;
  period: string;
  forecast: string;
}

export interface AlertStatus {
  active: boolean;
  severity: AlertSeverity;
  lastTriggered: Date;
  count: number;
  acknowledged: boolean;
}

export interface AnomalyData {
  id: string;
  metric: string;
  value: number;
  expected: number;
  deviation: number;
  severity: AlertSeverity;
  timestamp: Date;
  description: string;
  cause: string;
  recommendation: string;
}

export interface PredictionData {
  metric: string;
  predicted: number;
  confidence: number;
  timeHorizon: number;
  method: string;
  accuracy: number;
}

export interface HistoricalMetricData {
  baseline: BaselineData;
  trends: TrendAnalysis[];
  patterns: PatternAnalysis[];
  seasonality: SeasonalityData[];
  correlation: CorrelationData[];
}

export interface BaselineData {
  established: Date;
  metrics: Record<string, number>;
  confidence: number;
  stability: number;
  variance: number;
}

export interface TrendAnalysis {
  metric: string;
  direction: 'improving' | 'stable' | 'degrading';
  strength: number;
  significance: number;
  period: string;
  forecast: string;
}

export interface PatternAnalysis {
  name: string;
  type: 'recurring' | 'periodic' | 'burst' | 'degradation' | 'improvement';
  pattern: string;
  frequency: number;
  impact: number;
  predictability: number;
}

export interface SeasonalityData {
  metric: string;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  pattern: number[];
  strength: number;
  predictability: number;
}

export interface CorrelationData {
  metric1: string;
  metric2: string;
  correlation: number;
  lag: number;
  significance: number;
  type: 'positive' | 'negative' | 'none';
}

export interface MetricValue {
  current: number;
  target: number;
  threshold: number;
  minimum: number;
  maximum: number;
  average: number;
  median: number;
  standardDeviation: number;
  percentile95: number;
  percentile99: number;
  trend: TrendData;
  history: HistoricalValue[];
}

export interface HistoricalValue {
  timestamp: Date;
  value: number;
  quality: number;
}

export interface SystemDependency {
  name: string;
  type: 'service' | 'database' | 'cache' | 'queue' | 'external' | 'internal';
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  health: number;
  responseTime: number;
  availability: number;
  reliability: number;
  lastCheck: Date;
}

export interface SystemPerformance {
  overall: number;
  responseTime: number;
  throughput: number;
  latency: number;
  availability: number;
  efficiency: number;
  scalability: number;
  optimization: number;
  bottlenecks: Bottleneck[];
  improvements: PerformanceImprovement[];
}

export interface Bottleneck {
  component: string;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'database' | 'application';
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number;
  description: string;
  rootCause: string;
  solution: string;
  effort: 'low' | 'medium' | 'high';
  benefit: 'low' | 'medium' | 'high';
  timeline: string;
}

export interface PerformanceImprovement {
  id: string;
  name: string;
  description: string;
  type: 'optimization' | 'scaling' | 'caching' | 'refactoring' | 'architecture';
  impact: number;
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  benefits: string[];
  risks: string[];
  dependencies: string[];
  timeline: string;
}

export interface SystemReliability {
  overall: number;
  mtbf: number; // Mean Time Between Failures
  mttr: number; // Mean Time To Recovery
  availability: number;
  durability: number;
  faultTolerance: number;
  redundancy: number;
  failover: FailoverMetrics;
  recovery: RecoveryMetrics;
}

export interface FailoverMetrics {
  enabled: boolean;
  time: number;
  successRate: number;
  automatic: boolean;
  testing: boolean;
}

export interface RecoveryMetrics {
  automatic: boolean;
  time: number;
  steps: number;
  successRate: number;
  testing: boolean;
}

export interface SystemSecurity {
  overall: number;
  vulnerabilities: VulnerabilityData[];
  compliance: SecurityComplianceData;
  access: AccessControlData;
  encryption: EncryptionData;
  audit: AuditData;
  incidents: SecurityIncident[];
}

export interface VulnerabilityData {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cve?: string;
  description: string;
  affected: string[];
  mitigation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  discovered: Date;
  resolved?: Date;
}

export interface SecurityComplianceData {
  frameworks: Record<string, ComplianceStatus>;
  standards: Record<string, ComplianceStatus>;
  certifications: CertificationStatus[];
  lastAssessment: Date;
  nextAssessment: Date;
}

export interface ComplianceStatus {
  status: 'compliant' | 'non_compliant' | 'partial' | 'unknown';
  score: number;
  issues: string[];
  lastChecked: Date;
}

export interface CertificationStatus {
  name: string;
  valid: boolean;
  expiry: Date;
  issuer: string;
  scope: string[];
}

export interface AccessControlData {
  model: string;
  policies: AccessPolicy[];
  roles: AccessRole[];
  permissions: AccessPermission[];
  lastReview: Date;
}

export interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  conditions: string[];
  effect: 'allow' | 'deny';
  priority: number;
}

export interface AccessRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  users: string[];
  lastModified: Date;
}

export interface AccessPermission {
  id: string;
  resource: string;
  action: string;
  conditions: string[];
  granted: boolean;
}

export interface EncryptionData {
  algorithm: string;
  keyLength: number;
  keyRotation: number;
  inTransit: boolean;
  atRest: boolean;
  management: string;
}

export interface AuditData {
  enabled: boolean;
  retention: number;
  coverage: string[];
  lastReview: Date;
  findings: AuditFinding[];
}

export interface AuditFinding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  owner: string;
  dueDate: Date;
}

export interface SecurityIncident {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  description: string;
  affected: string[];
  detected: Date;
  resolved?: Date;
  response: string;
  lessons: string[];
}

export interface SystemCompliance {
  overall: number;
  frameworks: ComplianceFramework[];
  violations: ComplianceViolation[];
  assessments: ComplianceAssessment[];
  remediation: ComplianceRemediation[];
  reporting: ComplianceReporting;
}

export interface ComplianceFramework {
  name: string;
  version: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'unknown';
  score: number;
  controls: ComplianceControl[];
  lastAssessment: Date;
  nextAssessment: Date;
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  implementation: string;
  status: 'implemented' | 'partially_implemented' | 'not_implemented' | 'not_applicable';
  evidence: string[];
  gaps: string[];
  owner: string;
}

export interface ComplianceViolation {
  id: string;
  framework: string;
  control: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  remediation: string;
  dueDate: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  owner: string;
}

export interface ComplianceAssessment {
  id: string;
  framework: string;
  type: 'full' | 'partial' | 'targeted';
  scope: string[];
  findings: AssessmentFinding[];
  recommendations: string[];
  score: number;
  conducted: Date;
  conductedBy: string;
}

export interface AssessmentFinding {
  id: string;
  type: 'strength' | 'weakness' | 'opportunity' | 'threat';
  description: string;
  evidence: string[];
  impact: number;
  likelihood: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComplianceRemediation {
  id: string;
  violation: string;
  action: string;
  owner: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  dueDate: Date;
  completed?: Date;
  effectiveness: number;
}

export interface ComplianceReporting {
  enabled: boolean;
  frequency: 'real_time' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  format: string;
  recipients: string[];
  content: string[];
  automation: boolean;
}

export class RealTimeMonitor {
  private static readonly DEFAULT_INTERVAL = 10000; // 10 seconds
  private static readonly DEFAULT_RETENTION = 86400000; // 24 hours
  private static readonly MAX_ALERTS = 1000;

  private status: MonitorStatus = 'stopped';
  private monitoredSystems: Map<string, MonitoredSystem> = new Map();
  private activeMonitoring: Map<string, NodeJS.Timeout> = new Map();
  private alertHistory: AlertData[] = [];
  private cryptoKey: string;
  private database: any = null;
  private eventEmitter: any = null;

  constructor() {
    this.cryptoKey = process.env.REAL_TIME_MONITOR_KEY || 'default-monitor-key';
    this.initializeDefaultSystems();
  }

  /**
   * Start monitoring a system
   */
  async startMonitoring(systemId: string, configuration: Partial<MonitoringConfiguration> = {}): Promise<boolean> {
    try {
      logInfo('Starting system monitoring', {
        componentName: 'RealTimeMonitor',
        systemId,
        configuration
      });

      const system = this.monitoredSystems.get(systemId);
      if (!system) {
        logWarning('System not found for monitoring', {
          componentName: 'RealTimeMonitor',
          systemId
        });
        return false;
      }

      // Update configuration
      system.configuration = { ...this.createDefaultConfiguration(), ...configuration };
      
      // Set up monitoring interval
      const interval = setInterval(() => {
        this.performSystemCheck(system);
      }, system.configuration.interval);

      this.activeMonitoring.set(systemId, interval);
      system.status = 'running';
      system.updatedAt = new Date();

      logInfo('System monitoring started successfully', {
        componentName: 'RealTimeMonitor',
        systemId,
        interval: system.configuration.interval
      });

      return true;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'RealTimeMonitor',
        systemId,
        operation: 'start_monitoring'
      });
      return false;
    }
  }

  /**
   * Stop monitoring a system
   */
  async stopMonitoring(systemId: string): Promise<boolean> {
    try {
      const interval = this.activeMonitoring.get(systemId);
      if (interval) {
        clearInterval(interval);
        this.activeMonitoring.delete(systemId);
      }

      const system = this.monitoredSystems.get(systemId);
      if (system) {
        system.status = 'stopped';
        system.updatedAt = new Date();
      }

      logInfo('System monitoring stopped', {
        componentName: 'RealTimeMonitor',
        systemId
      });

      return true;

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'RealTimeMonitor',
        systemId,
        operation: 'stop_monitoring'
      });
      return false;
    }
  }

  /**
   * Perform health check on system
   */
  private async performSystemCheck(system: MonitoredSystem): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Check system health
      const health = await this.checkSystemHealth(system);
      system.health = health;

      // Collect metrics
      const metrics = await this.collectSystemMetrics(system);
      system.metrics = { ...system.metrics, ...metrics };

      // Check for alerts
      await this.checkAlertRules(system);

      // Update performance metrics
      system.performance = this.calculatePerformanceMetrics(system);
      system.reliability = this.calculateReliabilityMetrics(system);
      system.security = this.calculateSecurityMetrics(system);
      system.compliance = this.calculateComplianceMetrics(system);

      system.updatedAt = new Date();

    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        componentName: 'RealTimeMonitor',
        systemId: system.id,
        operation: 'system_check'
      });

      // Mark system as unhealthy
      system.health.overall = 'unhealthy';
      system.status = 'error';
    }
  }

  /**
   * Check system health
   */
  private async checkSystemHealth(system: MonitoredSystem): Promise<SystemHealth> {
    const components: ComponentHealth[] = [];
    const dependencies: DependencyHealth = {
      database: 'healthy',
      cache: 'healthy',
      queue: 'healthy',
      external: {}
    };

    // Check individual components
    const componentTypes = ['layer1', 'layer2', 'layer3', 'layer4', 'orchestration', 'integration'];
    
    for (const componentType of componentTypes) {
      const health = await this.checkComponentHealth(componentType);
      components.push(health);
    }

    // Check dependencies
    dependencies.database = await this.checkDependencyHealth('database');
    dependencies.cache = await this.checkDependencyHealth('cache');
    dependencies.queue = await this.checkDependencyHealth('queue');

    // Calculate overall health
    const componentHealths = components.map(c => c.health);
    const avgComponentHealth = componentHealths.reduce((sum, h) => sum + h, 0) / componentHealths.length;
    
    const overall = avgComponentHealth >= 0.9 ? 'healthy' :
                   avgComponentHealth >= 0.7 ? 'degraded' :
                   avgComponentHealth >= 0.5 ? 'unhealthy' : 'critical';

    return {
      overall,
      components,
      dependencies,
      lastCheck: new Date(),
      uptime: this.calculateUptime(system),
      responseTime: this.calculateAverageResponseTime(components),
      errorRate: this.calculateErrorRate(components)
    };
  }

  /**
   * Check individual component health
   */
  private async checkComponentHealth(componentName: string): Promise<ComponentHealth> {
    // Simulate component health check
    // In a real implementation, this would check actual component status
    
    const health = Math.random() * 0.3 + 0.7; // 0.7 to 1.0
    const responseTime = Math.random() * 100 + 50; // 50-150ms
    const errorCount = Math.random() < 0.05 ? Math.floor(Math.random() * 3) : 0;
    
    const status = health >= 0.9 ? 'healthy' :
                  health >= 0.7 ? 'degraded' :
                  health >= 0.5 ? 'unhealthy' : 'critical';

    return {
      name: componentName,
      status,
      health,
      lastCheck: new Date(),
      responseTime,
      errorCount,
      warnings: errorCount > 0 ? [`${errorCount} errors detected`] : []
    };
  }

  /**
   * Check dependency health
   */
  private async checkDependencyHealth(dependencyName: string): Promise<'healthy' | 'degraded' | 'unhealthy' | 'critical'> {
    // Simulate dependency health check
    const health = Math.random();
    
    return health >= 0.8 ? 'healthy' :
           health >= 0.6 ? 'degraded' :
           health >= 0.4 ? 'unhealthy' : 'critical';
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(system: MonitoredSystem): Promise<Partial<SystemMetrics>> {
    const systemMetrics: SystemMetricData = {
      cpu: this.createMetricValue(Math.random() * 100),
      memory: this.createMetricValue(Math.random() * 100),
      disk: this.createMetricValue(Math.random() * 100),
      network: this.createMetricValue(Math.random() * 100),
      load: this.createMetricValue(Math.random() * 10),
      processes: this.createMetricValue(Math.random() * 1000),
      connections: this.createMetricValue(Math.random() * 100),
      uptime: this.createMetricValue(this.calculateUptime(system) / 3600) // hours
    };

    const performanceMetrics: PerformanceMetricData = {
      responseTime: this.createMetricValue(Math.random() * 1000 + 100),
      throughput: this.createMetricValue(Math.random() * 1000),
      latency: this.createMetricValue(Math.random() * 100),
      errorRate: this.createMetricValue(Math.random() * 0.1),
      availability: this.createMetricValue(0.95 + Math.random() * 0.05),
      scalability: this.createMetricValue(Math.random() * 100),
      efficiency: this.createMetricValue(Math.random() * 100),
      optimization: this.createMetricValue(Math.random() * 100)
    };

    const businessMetrics: BusinessMetricData = {
      userSatisfaction: this.createMetricValue(0.7 + Math.random() * 0.3),
      conversionRate: this.createMetricValue(Math.random() * 0.1),
      revenue: this.createMetricValue(Math.random() * 10000),
      cost: this.createMetricValue(Math.random() * 5000),
      efficiency: this.createMetricValue(Math.random() * 100),
      quality: this.createMetricValue(0.8 + Math.random() * 0.2),
      growth: this.createMetricValue(Math.random() * 0.2),
      retention: this.createMetricValue(0.7 + Math.random() * 0.3)
    };

    return {
      system: systemMetrics,
      performance: performanceMetrics,
      business: businessMetrics,
      realTime: {
        current: {
          cpu: systemMetrics.cpu.current,
          memory: systemMetrics.memory.current,
          responseTime: performanceMetrics.responseTime.current,
          errorRate: performanceMetrics.errorRate.current
        },
        trends: {
          cpu: this.createTrendData('stable', 0.5, 0.8, '1h', 'Stable'),
          memory: this.createTrendData('increasing', 0.6, 0.7, '1h', 'Gradual increase'),
          responseTime: this.createTrendData('stable', 0.5, 0.9, '1h', 'Stable'),
          errorRate: this.createTrendData('decreasing', 0.4, 0.85, '1h', 'Improving')
        },
        alerts: {
          cpu: { active: false, severity: 'low', lastTriggered: new Date(), count: 0, acknowledged: false },
          memory: { active: false, severity: 'low', lastTriggered: new Date(), count: 0, acknowledged: false },
          responseTime: { active: false, severity: 'low', lastTriggered: new Date(), count: 0, acknowledged: false }
        },
        anomalies: [],
        predictions: []
      }
    };
  }

  /**
   * Create metric value
   */
  private createMetricValue(value: number): MetricValue {
    return {
      current: value,
      target: value * 0.9,
      threshold: value * 1.1,
      minimum: value * 0.7,
      maximum: value * 1.3,
      average: value,
      median: value,
      standardDeviation: value * 0.1,
      percentile95: value * 1.2,
      percentile99: value * 1.5,
      trend: this.createTrendData('stable', 0.5, 0.8, '1h', 'Stable'),
      history: []
    };
  }

  /**
   * Create trend data
   */
  private createTrendData(direction: 'increasing' | 'decreasing' | 'stable' | 'volatile', strength: number, confidence: number, period: string, forecast: string): TrendData {
    return {
      direction,
      strength,
      confidence,
      period,
      forecast
    };
  }

  /**
   * Check alert rules
   */
  private async checkAlertRules(system: MonitoredSystem): Promise<void> {
    // Simulate alert rule checking
    const alerts = ['high_cpu', 'high_memory', 'slow_response', 'error_spike'];
    
    for (const alert of alerts) {
      if (Math.random() < 0.1) { // 10% chance of alert
        await this.triggerAlert(system.id, alert, 'medium');
      }
    }
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(systemId: string, alertType: string, severity: AlertSeverity): Promise<void> {
    const alert: AlertData = {
      id: this.generateAlertId(),
      systemId,
      type: alertType,
      severity,
      message: `${alertType} detected on system ${systemId}`,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      data: {}
    };

    this.alertHistory.push(alert);
    
    // Keep only recent alerts
    if (this.alertHistory.length > RealTimeMonitor.MAX_ALERTS) {
      this.alertHistory = this.alertHistory.slice(-RealTimeMonitor.MAX_ALERTS);
    }

    logWarning('Alert triggered', {
      componentName: 'RealTimeMonitor',
      alertId: alert.id,
      systemId,
      alertType,
      severity
    });

    // In a real implementation, this would send notifications
    await this.sendAlertNotifications(alert);
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: AlertData): Promise<void> {
    // Simulate sending notifications
    // In a real implementation, this would send to configured channels
    
    logInfo('Alert notifications sent', {
      componentName: 'RealTimeMonitor',
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity
    });
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(system: MonitoredSystem): SystemPerformance {
    const health = system.health;
    
    return {
      overall: health.overall === 'healthy' ? 0.9 :
              health.overall === 'degraded' ? 0.7 :
              health.overall === 'unhealthy' ? 0.5 : 0.2,
      responseTime: health.responseTime,
      throughput: 1000 / (health.responseTime || 1000),
      latency: health.responseTime,
      availability: health.overall === 'healthy' ? 0.99 :
                   health.overall === 'degraded' ? 0.95 :
                   health.overall === 'unhealthy' ? 0.90 : 0.80,
      efficiency: 0.85,
      scalability: 0.80,
      optimization: 0.75,
      bottlenecks: [
        {
          component: 'database',
          type: 'database',
          severity: 'medium',
          impact: 0.3,
          description: 'Database queries taking longer than expected',
          rootCause: 'Missing indexes',
          solution: 'Add proper database indexes',
          effort: 'medium',
          benefit: 'medium',
          timeline: '1 week'
        }
      ],
      improvements: [
        {
          id: 'cache_optimization',
          name: 'Cache Optimization',
          description: 'Implement better caching strategy',
          type: 'caching',
          impact: 0.2,
          effort: 'low',
          priority: 'medium',
          status: 'planned',
          benefits: ['Improved response time', 'Reduced database load'],
          risks: ['Cache invalidation complexity'],
          dependencies: [],
          timeline: '2 weeks'
        }
      ]
    };
  }

  /**
   * Calculate reliability metrics
   */
  private calculateReliabilityMetrics(system: MonitoredSystem): SystemReliability {
    const errorRate = system.health.errorRate;
    const availability = system.health.overall === 'healthy' ? 0.99 : 0.95;
    
    return {
      overall: availability * (1 - errorRate),
      mtbf: 7200, // 2 hours
      mttr: 300,  // 5 minutes
      availability,
      durability: 0.999,
      faultTolerance: 0.95,
      redundancy: 0.90,
      failover: {
        enabled: true,
        time: 30,
        successRate: 0.98,
        automatic: true,
        testing: true
      },
      recovery: {
        automatic: true,
        time: 180,
        steps: 5,
        successRate: 0.95,
        testing: true
      }
    };
  }

  /**
   * Calculate security metrics
   */
  private calculateSecurityMetrics(system: MonitoredSystem): SystemSecurity {
    return {
      overall: 0.85,
      vulnerabilities: [
        {
          id: 'vuln_001',
          severity: 'medium',
          cve: 'CVE-2023-1234',
          description: 'Outdated library vulnerability',
          affected: ['layer1', 'layer2'],
          mitigation: 'Update to latest version',
          status: 'in_progress',
          discovered: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      ],
      compliance: {
        frameworks: {
          'GDPR': { status: 'compliant', score: 0.95, issues: [], lastChecked: new Date() },
          'SOC2': { status: 'partial', score: 0.88, issues: ['Audit trail incomplete'], lastChecked: new Date() }
        },
        standards: {},
        certifications: [],
        lastAssessment: new Date(),
        nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      },
      access: {
        model: 'RBAC',
        policies: [],
        roles: [],
        permissions: [],
        lastReview: new Date()
      },
      encryption: {
        algorithm: 'AES-256',
        keyLength: 256,
        keyRotation: 90,
        inTransit: true,
        atRest: true,
        management: 'internal'
      },
      audit: {
        enabled: true,
        retention: 365,
        coverage: ['authentication', 'authorization', 'data_access'],
        lastReview: new Date(),
        findings: []
      },
      incidents: []
    };
  }

  /**
   * Calculate compliance metrics
   */
  private calculateComplianceMetrics(system: MonitoredSystem): SystemCompliance {
    return {
      overall: 0.88,
      frameworks: [
        {
          name: 'GDPR',
          version: '1.0',
          status: 'compliant',
          score: 0.95,
          controls: [],
          lastAssessment: new Date(),
          nextAssessment: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      ],
      violations: [],
      assessments: [],
      remediation: [],
      reporting: {
        enabled: true,
        frequency: 'monthly',
        format: 'pdf',
        recipients: ['compliance@example.com'],
        content: ['summary', 'details', 'charts'],
        automation: true
      }
    };
  }

  /**
   * Initialize default monitoring systems
   */
  private initializeDefaultSystems(): void {
    const systems = [
      { id: 'hallucination-prevention', name: 'Hallucination Prevention System', type: 'system' as MonitorType },
      { id: 'layer1', name: 'Layer 1 - Input Processing', type: 'performance' as MonitorType },
      { id: 'layer2', name: 'Layer 2 - Context Management', type: 'performance' as MonitorType },
      { id: 'layer3', name: 'Layer 3 - Response Validation', type: 'quality' as MonitorType },
      { id: 'layer4', name: 'Layer 4 - User Feedback', type: 'business' as MonitorType },
      { id: 'orchestration', name: 'System Orchestration', type: 'system' as MonitorType }
    ];

    for (const systemData of systems) {
      const system: MonitoredSystem = {
        id: systemData.id,
        name: systemData.name,
        type: systemData.type,
        status: 'stopped',
        health: {
          overall: 'healthy',
          components: [],
          dependencies: { database: 'healthy', cache: 'healthy', queue: 'healthy', external: {} },
          lastCheck: new Date(),
          uptime: 0,
          responseTime: 0,
          errorRate: 0
        },
        metrics: {
          system: {
            cpu: this.createMetricValue(50),
            memory: this.createMetricValue(60),
            disk: this.createMetricValue(40),
            network: this.createMetricValue(30),
            load: this.createMetricValue(2),
            processes: this.createMetricValue(50),
            connections: this.createMetricValue(20),
            uptime: this.createMetricValue(0)
          },
          performance: {
            responseTime: this.createMetricValue(200),
            throughput: this.createMetricValue(100),
            latency: this.createMetricValue(50),
            errorRate: this.createMetricValue(0.01),
            availability: this.createMetricValue(0.99),
            scalability: this.createMetricValue(80),
            efficiency: this.createMetricValue(85),
            optimization: this.createMetricValue(75)
          },
          business: {
            userSatisfaction: this.createMetricValue(0.8),
            conversionRate: this.createMetricValue(0.05),
            revenue: this.createMetricValue(1000),
            cost: this.createMetricValue(500),
            efficiency: this.createMetricValue(85),
            quality: this.createMetricValue(0.9),
            growth: this.createMetricValue(0.1),
            retention: this.createMetricValue(0.85)
          },
          custom: [],
          realTime: {
            current: { cpu: 50, memory: 60, responseTime: 200, errorRate: 0.01 },
            trends: {},
            alerts: {},
            anomalies: [],
            predictions: []
          },
          historical: {
            baseline: { established: new Date(), metrics: {}, confidence: 0.8, stability: 0.9, variance: 0.1 },
            trends: [],
            patterns: [],
            seasonality: [],
            correlation: []
          }
        },
        configuration: this.createDefaultConfiguration(),
        dependencies: [],
        performance: {
          overall: 0.85,
          responseTime: 200,
          throughput: 100,
          latency: 50,
          availability: 0.99,
          efficiency: 0.85,
          scalability: 0.80,
          optimization: 0.75,
          bottlenecks: [],
          improvements: []
        },
        reliability: {
          overall: 0.95,
          mtbf: 7200,
          mttr: 300,
          availability: 0.99,
          durability: 0.999,
          faultTolerance: 0.95,
          redundancy: 0.90,
          failover: { enabled: true, time: 30, successRate: 0.98, automatic: true, testing: true },
          recovery: { automatic: true, time: 180, steps: 5, successRate: 0.95, testing: true }
        },
        security: {
          overall: 0.85,
          vulnerabilities: [],
          compliance: {
            frameworks: {},
            standards: {},
            certifications: [],
            lastAssessment: new Date(),
            nextAssessment: new Date()
          },
          access: { model: 'RBAC', policies: [], roles: [], permissions: [], lastReview: new Date() },
          encryption: { algorithm: 'AES-256', keyLength: 256, keyRotation: 90, inTransit: true, atRest: true, management: 'internal' },
          audit: { enabled: true, retention: 365, coverage: [], lastReview: new Date(), findings: [] },
          incidents: []
        },
        compliance: {
          overall: 0.88,
          frameworks: [],
          violations: [],
          assessments: [],
          remediation: [],
          reporting: { enabled: true, frequency: 'monthly', format: 'pdf', recipients: [], content: [], automation: true }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.monitoredSystems.set(systemData.id, system);
    }
  }

  /**
   * Create default monitoring configuration
   */
  private createDefaultConfiguration(): MonitoringConfiguration {
    return {
      enabled: true,
      interval: RealTimeMonitor.DEFAULT_INTERVAL,
      retention: RealTimeMonitor.DEFAULT_RETENTION,
      sampling: 1.0,
      buffering: {
        enabled: true,
        size: 1000,
        flushInterval: 5000,
        compression: false,
        priority: 'latency',
        strategy: 'batch',
        backpressure: { enabled: false, threshold: 1000, strategy: 'drop', maxQueueSize: 10000, queueStrategy: 'fifo' }
      },
      storage: {
        type: 'memory',
        retention: RealTimeMonitor.DEFAULT_RETENTION,
        compression: false,
        encryption: false,
        partitioning: { enabled: false, strategy: 'time', interval: '1h', size: 1000, custom: '' },
        archival: { enabled: false, strategy: 'automatic', threshold: 1000000, destination: '', compression: false, retention: 2592000 }
      },
      alerts: {
        enabled: true,
        channels: [
          {
            id: 'log_channel',
            type: 'log',
            name: 'Log Channel',
            configuration: {},
            enabled: true,
            priority: 1,
            filters: []
          }
        ],
        rules: [],
        escalation: { enabled: false, levels: [], delay: 0, maxLevel: 0, conditions: [] },
        suppression: { enabled: false, rules: [], timeWindow: 3600000, maxSuppressions: 10, strategy: 'time_based' },
        aggregation: { enabled: false, window: 60000, threshold: 5, strategy: 'count', groupBy: [], deduplication: true },
        routing: { enabled: false, rules: [], loadBalancing: { enabled: false, algorithm: 'round_robin', healthCheck: true, weight: {} }, failover: { enabled: false, primary: [], secondary: [], healthCheck: true, timeout: 10000, retryAttempts: 3 } }
      },
      dashboard: {
        enabled: false,
        type: 'realtime',
        refreshRate: 30000,
        layout: { type: 'grid', columns: 12, rows: 8, gap: 10, responsive: true, theme: 'light', customCSS: '' },
        widgets: [],
        filters: [],
        permissions: { view: ['admin'], edit: ['admin'], admin: ['admin'], export: ['admin'], share: false, anonymous: false },
        export: { enabled: false, formats: ['pdf'], quality: 'standard', size: 'medium', background: 'white', watermark: false, metadata: false },
        sharing: { enabled: false, type: 'private', permissions: [], expiration: '', password: false, tracking: false }
      },
      privacy: {
        enabled: true,
        anonymization: { enabled: true, fields: ['user_id', 'ip_address'], method: 'mask', strength: 'medium', reversible: false },
        piiHandling: { enabled: true, detection: true, handling: 'mask', fields: ['email', 'phone'], classification: 'pii' },
        retention: { enabled: true, default: 7776000, extended: 15552000, deletion: 'automatic', archival: true },
        consent: { enabled: true, types: [], collection: 'explicit', management: 'self_service' },
        gdpr: { enabled: true, rightToAccess: true, rightToRectification: true, rightToErasure: true, rightToPortability: true, dataProtectionOfficer: '', lawfulBasis: '' }
      },
      security: {
        enabled: true,
        authentication: { enabled: true, methods: ['basic'], multiFactor: false, sessionTimeout: 3600, passwordPolicy: { enabled: true, minLength: 8, requireUppercase: true, requireLowercase: true, requireNumbers: true, requireSpecial: false, history: 5, expiry: 90 }, lockout: { enabled: true, attempts: 5, duration: 300, progressive: true } },
        authorization: { enabled: true, model: 'rbac', roles: ['admin', 'user'], permissions: ['read', 'write', 'admin'], policies: [] },
        encryption: { enabled: true, atRest: true, inTransit: true, algorithm: 'AES-256', keyManagement: { provider: 'internal', rotation: 90, backup: true, access: [] } },
        audit: { enabled: true, level: 'standard', retention: 365, encryption: true, tamperProof: true },
        compliance: { frameworks: [], standards: [], certifications: [], reporting: true },
        incidentResponse: { enabled: true, procedures: [], notification: { channels: [], recipients: [], template: '', escalation: false }, escalation: { enabled: false, levels: 0, delay: 0, automatic: false }, recovery: { enabled: true, procedures: [], testing: true, documentation: true } }
      }
    };
  }

  // Utility methods
  private calculateUptime(system: MonitoredSystem): number {
    return (Date.now() - system.createdAt.getTime()) / 1000;
  }

  private calculateAverageResponseTime(components: ComponentHealth[]): number {
    if (components.length === 0) return 0;
    return components.reduce((sum, c) => sum + c.responseTime, 0) / components.length;
  }

  private calculateErrorRate(components: ComponentHealth[]): number {
    if (components.length === 0) return 0;
    const totalErrors = components.reduce((sum, c) => sum + c.errorCount, 0);
    return totalErrors / (components.length * 100); // Normalized error rate
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): {
    status: MonitorStatus;
    activeSystems: number;
    totalSystems: number;
    recentAlerts: number;
    overallHealth: string;
  } {
    const activeSystems = Array.from(this.monitoredSystems.values()).filter(s => s.status === 'running').length;
    const totalSystems = this.monitoredSystems.size;
    const recentAlerts = this.alertHistory.filter(a => 
      Date.now() - a.timestamp.getTime() < 3600000 // Last hour
    ).length;

    const healthySystems = Array.from(this.monitoredSystems.values()).filter(s => s.health.overall === 'healthy').length;
    const overallHealth = healthySystems === totalSystems ? 'healthy' :
                         healthySystems > totalSystems * 0.7 ? 'degraded' :
                         healthySystems > totalSystems * 0.3 ? 'unhealthy' : 'critical';

    return {
      status: this.status,
      activeSystems,
      totalSystems,
      recentAlerts,
      overallHealth
    };
  }

  /**
   * Get system monitoring data
   */
  getSystemData(systemId: string): MonitoredSystem | null {
    return this.monitoredSystems.get(systemId) || null;
  }

  /**
   * Get all monitoring data
   */
  getAllSystemData(): MonitoredSystem[] {
    return Array.from(this.monitoredSystems.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): AlertData[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    // Clear all monitoring intervals
    for (const interval of this.activeMonitoring.values()) {
      clearInterval(interval);
    }
    this.activeMonitoring.clear();
    
    // Reset state
    this.status = 'stopped';
    this.alertHistory = [];
  }
}

// Alert data interface for internal use
interface AlertData {
  id: string;
  systemId: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  data: Record<string, any>;
}

// Export singleton instance
export const realTimeMonitor = new RealTimeMonitor();

// Convenience functions
export const startMonitoring = (systemId: string, config?: Partial<MonitoringConfiguration>) =>
  realTimeMonitor.startMonitoring(systemId, config);

export const stopMonitoring = (systemId: string) =>
  realTimeMonitor.stopMonitoring(systemId);

export const getMonitoringStatus = () =>
  realTimeMonitor.getMonitoringStatus();

export const getSystemData = (systemId: string) =>
  realTimeMonitor.getSystemData(systemId);