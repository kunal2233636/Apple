// Memory References Component
// ============================

import { Brain, Calendar, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { MemoryReference } from '@/types/study-buddy';

interface MemoryReferencesProps {
  memoryReferences: MemoryReference[];
  className?: string;
}

export function MemoryReferences({ memoryReferences, className = '' }: MemoryReferencesProps) {
  if (!memoryReferences || memoryReferences.length === 0) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return 'Recent';
    } else if (diffInHours < 24 * 7) {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24 * 30) {
      const weeks = Math.floor(diffInHours / (24 * 7));
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'text-green-600 bg-green-50 border-green-200';
    if (similarity >= 0.8) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (similarity >= 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getSimilarityLabel = (similarity: number) => {
    if (similarity >= 0.9) return 'Very relevant';
    if (similarity >= 0.8) return 'Highly relevant';
    if (similarity >= 0.7) return 'Relevant';
    return 'Somewhat relevant';
  };

  return (
    <Card className={`mt-3 p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/30 border-blue-200 ${className}`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Brain className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm font-medium text-blue-700">
            📚 Remembering from our conversations:
          </span>
        </div>

        {/* Memory References */}
        <div className="space-y-2">
          {memoryReferences.map((reference, index) => (
            <TooltipProvider key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`
                    flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-sm
                    ${getSimilarityColor(reference.similarity)}
                  `}>
                    {/* Date indicator */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-blue-600" />
                          <span className="text-xs font-medium text-blue-600">
                            {formatDate(reference.created_at)}
                          </span>
                        </div>
                        
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                        >
                          {Math.round(reference.similarity * 100)}% match
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-blue-800 leading-relaxed">
                        {reference.content}
                      </p>

                      {reference.relevanceScore && (
                        <div className="flex items-center gap-1 mt-2">
                          <TrendingUp className="h-3 w-3 text-blue-500" />
                          <span className="text-xs text-blue-600">
                            Relevance: {getSimilarityLabel(reference.relevanceScore)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                
                <TooltipContent side="top" className="max-w-sm">
                  <div className="space-y-2">
                    <p className="font-medium">Memory Reference</p>
                    <p className="text-sm">{reference.content}</p>
                    <div className="text-xs text-muted-foreground">
                      {getSimilarityLabel(reference.similarity)} • 
                      {new Date(reference.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* Summary Footer */}
        <div className="pt-3 border-t border-blue-200">
          <div className="flex items-center justify-between text-xs text-blue-600">
            <span className="flex items-center gap-1">
              <Brain className="h-3 w-3" />
              {memoryReferences.length} relevant memory{memoryReferences.length !== 1 ? 'ies' : ''} found
            </span>
            <span className="text-blue-500">
              Semantic search powered
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default MemoryReferences;