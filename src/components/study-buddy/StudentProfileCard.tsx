// Student Profile Card Component
// ============================

import { useState, useEffect } from 'react';
import { User, Brain, Target, Award, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface StudentProfileData {
  profileText: string;
  strongSubjects: string[];
  weakSubjects: string[];
  examTarget?: string;
  studyProgress: {
    totalTopics: number;
    completedTopics: number;
    accuracy: number;
  };
  currentData: {
    streak: number;
    level: number;
    points: number;
    revisionQueue: number;
  };
  lastUpdated: string;
}

interface StudentProfileCardProps {
  userId: string;
  className?: string;
}

export function StudentProfileCard({ userId, className = '' }: StudentProfileCardProps) {
  const [profileData, setProfileData] = useState<StudentProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfileData();
    
    // Refresh profile every 5 minutes
    const interval = setInterval(fetchProfileData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/student/profile?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      
      if (data.success) {
        setProfileData(data.data);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching student profile:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      
      // Set fallback profile data
      setProfileData({
        profileText: 'Profile loading...',
        strongSubjects: [],
        weakSubjects: [],
        studyProgress: {
          totalTopics: 0,
          completedTopics: 0,
          accuracy: 0
        },
        currentData: {
          streak: 0,
          level: 1,
          points: 0,
          revisionQueue: 0
        },
        lastUpdated: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={`p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 ${className}`}>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </Card>
    );
  }

  if (error || !profileData) {
    return (
      <Card className={`p-4 bg-amber-50 border-amber-200 ${className}`}>
        <div className="flex items-center gap-2 text-amber-700">
          <Brain className="h-4 w-4" />
          <span className="text-sm">Profile temporarily unavailable</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Coach Icon */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          
          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-gray-900">Your AI Coach</span>
              {profileData.currentData.streak > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Award className="h-3 w-3 mr-1" />
                  {profileData.currentData.streak} day streak
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-gray-600 mb-1">
              {profileData.profileText}
            </p>
            
            {/* Progress Bar */}
            {profileData.studyProgress.totalTopics > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(profileData.studyProgress.completedTopics / profileData.studyProgress.totalTopics) * 100}%` 
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {profileData.studyProgress.completedTopics}/{profileData.studyProgress.totalTopics}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <div className="text-center">
            <div className="font-medium text-gray-900">{profileData.studyProgress.accuracy}%</div>
            <div className="text-gray-500">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">{profileData.currentData.level}</div>
            <div className="text-gray-500">Level</div>
          </div>
          {profileData.currentData.revisionQueue > 0 && (
            <div className="text-center">
              <div className="font-medium text-orange-600">{profileData.currentData.revisionQueue}</div>
              <div className="text-gray-500">Revisions</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Memory Stats (optional display) */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <div className="flex items-center justify-between text-xs text-blue-600">
          <span className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            AI remembers your study patterns
          </span>
          <span className="text-blue-500">
            Updated {new Date(profileData.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </Card>
  );
}

export default StudentProfileCard;