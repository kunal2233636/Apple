// Supabase database types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      subjects: {
        Row: {
          id: number
          user_id: string
          name: string
          color: string
          category: 'JEE' | 'BOARDS' | 'OTHERS' | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          color: string
          category?: 'JEE' | 'BOARDS' | 'OTHERS' | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          color?: string
          category?: 'JEE' | 'BOARDS' | 'OTHERS' | null
          created_at?: string
        }
      }
      chapters: {
        Row: {
          id: number
          name: string
          subject_id: number
          user_id: string
          category: 'JEE' | 'BOARDS' | 'OTHERS' | null
          created_at: string
          is_board_certified?: boolean
          certification_date?: string | null
          has_pending_questions?: boolean
          is_available_for_study?: boolean
          is_available_for_revision?: boolean
          subjects?: {
            id: number
            name: string
            color: string
            category: 'JEE' | 'BOARDS' | 'OTHERS' | null
          }
        }
        Insert: {
          id?: number
          name: string
          subject_id: number
          user_id: string
          category?: 'JEE' | 'BOARDS' | 'OTHERS' | null
          created_at?: string
          is_board_certified?: boolean
          certification_date?: string | null
          has_pending_questions?: boolean
          is_available_for_study?: boolean
          is_available_for_revision?: boolean
        }
        Update: {
          id?: number
          name?: string
          subject_id?: number
          user_id?: string
          category?: 'JEE' | 'BOARDS' | 'OTHERS' | null
          created_at?: string
          is_board_certified?: boolean
          certification_date?: string | null
          has_pending_questions?: boolean
          is_available_for_study?: boolean
          is_available_for_revision?: boolean
        }
      }
      topics: {
        Row: {
          id: number
          name: string
          chapter_id: number
          subject_id: number
          user_id: string
          difficulty: 'Easy' | 'Medium' | 'Hard' | null
          status: 'pending' | 'in_progress' | 'completed'
          created_at: string
          last_revised_date: string | null
          next_revision_date: string | null
          revision_count: number
          is_in_spare: boolean
          spare_interval_days: number
          is_remaining: boolean
          remaining_since_date: string | null
          studied_count: number
          is_spare_only: boolean
          is_half_done: boolean
          category: 'JEE' | 'BOARDS' | 'OTHERS' | null
        }
        Insert: {
          id?: number
          name: string
          chapter_id: number
          subject_id: number
          user_id: string
          difficulty?: 'Easy' | 'Medium' | 'Hard' | null
          status?: 'pending' | 'in_progress' | 'completed'
          created_at?: string
          last_revised_date?: string | null
          next_revision_date?: string | null
          revision_count?: number
          is_in_spare?: boolean
          spare_interval_days?: number
          is_remaining?: boolean
          remaining_since_date?: string | null
          studied_count?: number
          is_spare_only?: boolean
          is_half_done?: boolean
          category?: 'JEE' | 'BOARDS' | 'OTHERS' | null
        }
        Update: {
          id?: number
          name?: string
          chapter_id?: number
          subject_id?: number
          user_id?: string
          difficulty?: 'Easy' | 'Medium' | 'Hard' | null
          status?: 'pending' | 'in_progress' | 'completed'
          created_at?: string
          last_revised_date?: string | null
          next_revision_date?: string | null
          revision_count?: number
          is_in_spare?: boolean
          spare_interval_days?: number
          is_remaining?: boolean
          remaining_since_date?: string | null
          studied_count?: number
          is_spare_only?: boolean
          is_half_done?: boolean
          category?: 'JEE' | 'BOARDS' | 'OTHERS' | null
        }
      }
      blocks: {
        Row: {
          id: string
          title: string
          date: string
          start_time: string
          end_time: string
          duration: number
          user_id: string
          type: 'Study' | 'Question'
          category: string | null
          status: 'planned' | 'ongoing' | 'completed' | 'cancelled'
          topics: string[] | null
          chapters: string[] | null
          created_at: string
          updated_at: string
          subject?: string | null
        }
        Insert: {
          id?: string
          title: string
          date: string
          start_time: string
          end_time: string
          duration: number
          user_id: string
          type: 'Study' | 'Question'
          category?: string | null
          status?: 'planned' | 'ongoing' | 'completed' | 'cancelled'
          topics?: string[] | null
          chapters?: string[] | null
          created_at?: string
          updated_at?: string
          subject?: string | null
        }
        Update: {
          id?: string
          title?: string
          date?: string
          start_time?: string
          end_time?: string
          duration?: number
          user_id?: string
          type?: 'Study' | 'Question'
          category?: string | null
          status?: 'planned' | 'ongoing' | 'completed' | 'cancelled'
          topics?: string[] | null
          chapters?: string[] | null
          created_at?: string
          updated_at?: string
          subject?: string | null
        }
      }
      feedback: {
        Row: {
          id: number
          block_id: string
          user_id: string
          completed_topics: string[]
          not_done_topics: Json
          feedback_notes: string | null
          created_at: string
        }
        Insert: {
          id?: number
          block_id: string
          user_id: string
          completed_topics: string[]
          not_done_topics?: Json
          feedback_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          block_id?: string
          user_id?: string
          completed_topics?: string[]
          not_done_topics?: Json
          feedback_notes?: string | null
          created_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: number
          user_id: string
          activity_type: string
          summary: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          activity_type: string
          summary: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          activity_type?: string
          summary?: string
          details?: Json | null
          created_at?: string
        }
      }
      daily_activity_summary: {
        Row: {
          id: number
          user_id: string
          date: string
          total_study_minutes: number
          blocks_completed_count: number
          current_streak: number
          points_earned: number
          highlights: Json | null
          concerns: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          date: string
          total_study_minutes?: number
          blocks_completed_count?: number
          current_streak?: number
          points_earned?: number
          highlights?: Json | null
          concerns?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          date?: string
          total_study_minutes?: number
          blocks_completed_count?: number
          current_streak?: number
          points_earned?: number
          highlights?: Json | null
          concerns?: Json | null
          created_at?: string
        }
      }
      user_gamification: {
        Row: {
          id: number
          user_id: string
          current_streak: number
          longest_streak: number
          total_points_earned: number
          total_penalty_points: number
          current_level: number
          level: number
          experience_points: number
          total_topics_completed: number
          badges_earned: Json | null
          last_activity_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          current_streak?: number
          longest_streak?: number
          total_points_earned?: number
          total_penalty_points?: number
          current_level?: number
          level?: number
          experience_points?: number
          total_topics_completed?: number
          badges_earned?: Json | null
          last_activity_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          current_streak?: number
          longest_streak?: number
          total_points_earned?: number
          total_penalty_points?: number
          current_level?: number
          level?: number
          experience_points?: number
          total_topics_completed?: number
          badges_earned?: Json | null
          last_activity_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: number
          block_id: string
          user_id: string
          started_at: string
          ended_at: string | null
          status: 'active' | 'completed' | 'paused'
          duration_minutes: number | null
          session_type: 'study' | 'break'
          created_at: string
        }
        Insert: {
          id?: number
          block_id: string
          user_id: string
          started_at?: string
          ended_at?: string | null
          status?: 'active' | 'completed' | 'paused'
          duration_minutes?: number | null
          session_type?: 'study' | 'break'
          created_at?: string
        }
        Update: {
          id?: number
          block_id?: string
          user_id?: string
          started_at?: string
          ended_at?: string | null
          status?: 'active' | 'completed' | 'paused'
          duration_minutes?: number | null
          session_type?: 'study' | 'break'
          created_at?: string
        }
      }
      pomodoro_templates: {
        Row: {
          id: string
          user_id: string | null
          name: string
          sessions_json: Json
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          sessions_json: Json
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          sessions_json?: Json
          is_default?: boolean
          created_at?: string
        }
      }
      points_history: {
        Row: {
          id: number
          user_id: string
          points_awarded: number
          reason: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          points_awarded: number
          reason: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          points_awarded?: number
          reason?: string
          details?: Json | null
          created_at?: string
        }
      }
      user_badges: {
        Row: {
          id: number
          user_id: string
          badge_name: string
          badge_type: string
          badge_icon: string
          badge_description: string
          earned_at: string
        }
        Insert: {
          id?: number
          user_id: string
          badge_name: string
          badge_type: string
          badge_icon: string
          badge_description: string
          earned_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          badge_name?: string
          badge_type?: string
          badge_icon?: string
          badge_description?: string
          earned_at?: string
        }
      }
      user_gdrive_credentials: {
        Row: {
          id: number
          user_id: string
          access_token: string
          refresh_token: string
          expiry_date: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          access_token: string
          refresh_token: string
          expiry_date: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          access_token?: string
          refresh_token?: string
          expiry_date?: string
          updated_at?: string
        }
      }
      revision_topics: {
        Row: {
          id: number
          user_id: string
          topic_id: number
          topic_name: string
          due_date: string
          priority: 'low' | 'medium' | 'high' | 'critical'
          is_completed: boolean
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          topic_id: number
          topic_name: string
          due_date: string
          priority?: 'low' | 'medium' | 'high' | 'critical'
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          topic_id?: number
          topic_name?: string
          due_date?: string
          priority?: 'low' | 'medium' | 'high' | 'critical'
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      resources: {
        Row: {
          id: number
          user_id: string
          type: 'note' | 'other'
          title: string
          content: string | null
          description: string | null
          url: string | null
          category: 'JEE' | 'Other'
          subject: string | null
          tags: string[] | null
          is_favorite: boolean
          file_path: string | null
          file_name: string | null
          file_size: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          type: 'note' | 'other'
          title: string
          content?: string | null
          description?: string | null
          url?: string | null
          category: 'JEE' | 'Other'
          subject?: string | null
          tags?: string[] | null
          is_favorite?: boolean
          file_path?: string | null
          file_name?: string | null
          file_size?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          type?: 'note' | 'other'
          title?: string
          content?: string | null
          description?: string | null
          url?: string | null
          category?: 'JEE' | 'Other'
          subject?: string | null
          tags?: string[] | null
          is_favorite?: boolean
          file_path?: string | null
          file_name?: string | null
          file_size?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      revision_queue: {
        Row: {
          id: number
          user_id: string
          topic_id: number
          difficulty: 'Easy' | 'Medium' | 'Hard'
          added_date: string
        }
        Insert: {
          id?: number
          user_id: string
          topic_id: number
          difficulty?: 'Easy' | 'Medium' | 'Hard'
          added_date?: string
        }
        Update: {
          id?: number
          user_id?: string
          topic_id?: number
          difficulty?: 'Easy' | 'Medium' | 'Hard'
          added_date?: string
        }
      }
      user_penalties: {
        Row: {
          id: number
          user_id: string
          penalty_type: string
          points_deducted: number
          reason: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          penalty_type: string
          points_deducted: number
          reason: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          penalty_type?: string
          points_deducted?: number
          reason?: string
          details?: Json | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [key: string]: {
        Row: Record<string, any>
      }
    }
    Functions: {
      [key: string]: {
        Args: Record<string, any>
        Returns: any
      }
    }
    Enums: {
      [key: string]: string
    }
  }
}