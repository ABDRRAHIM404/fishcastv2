/**
 * Hand-written Database types mirroring the Phase 2 schema.
 * Regenerate with `supabase gen types typescript` once the CLI is wired.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SpotType = 'beach' | 'rocks' | 'port' | 'river_mouth' | 'pier';
export type DifficultyLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';
export type Prevalence = 'common' | 'occasional' | 'rare';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
        };
      };
      regions: {
        Row: {
          id: string;
          name: string;
          country: string | null;
          bounds: Json | null;
        };
        Insert: {
          id?: string;
          name: string;
          country?: string | null;
          bounds?: Json | null;
        };
        Update: Partial<Database['public']['Tables']['regions']['Insert']>;
      };
      spots: {
        Row: {
          id: string;
          region_id: string | null;
          name: string;
          lat: number;
          lng: number;
          type: SpotType;
          description: string | null;
          difficulty_level: DifficultyLevel;
          difficulty_factors: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          region_id?: string | null;
          name: string;
          lat: number;
          lng: number;
          type: SpotType;
          description?: string | null;
          difficulty_level?: DifficultyLevel;
          difficulty_factors?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['spots']['Insert']>;
      };
      spot_photos: {
        Row: { id: string; spot_id: string; url: string; position: number };
        Insert: {
          id?: string;
          spot_id: string;
          url: string;
          position?: number;
        };
        Update: Partial<Database['public']['Tables']['spot_photos']['Insert']>;
      };
      favorites: {
        Row: { user_id: string; spot_id: string; created_at: string };
        Insert: { user_id: string; spot_id: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['favorites']['Insert']>;
      };
      condition_snapshots: {
        Row: {
          id: string;
          spot_id: string;
          captured_at: string;
          tide_height: number | null;
          tide_state: string | null;
          wind_speed: number | null;
          wind_dir: number | null;
          wave_height: number | null;
          weather: Json | null;
          source: string | null;
        };
        Insert: {
          id?: string;
          spot_id: string;
          captured_at?: string;
          tide_height?: number | null;
          tide_state?: string | null;
          wind_speed?: number | null;
          wind_dir?: number | null;
          wave_height?: number | null;
          weather?: Json | null;
          source?: string | null;
        };
        Update: Partial<
          Database['public']['Tables']['condition_snapshots']['Insert']
        >;
      };
      community_reports: {
        Row: {
          id: string;
          spot_id: string;
          user_id: string;
          species_id: string | null;
          catch_count: number | null;
          notes: string | null;
          rating: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          spot_id: string;
          user_id: string;
          species_id?: string | null;
          catch_count?: number | null;
          notes?: string | null;
          rating?: number | null;
          created_at?: string;
        };
        Update: Partial<
          Database['public']['Tables']['community_reports']['Insert']
        >;
      };
      score_cache: {
        Row: {
          spot_id: string;
          computed_at: string;
          score: number;
          factors: Json | null;
        };
        Insert: {
          spot_id: string;
          computed_at?: string;
          score: number;
          factors?: Json | null;
        };
        Update: Partial<Database['public']['Tables']['score_cache']['Insert']>;
      };
      species: {
        Row: {
          id: string;
          common_name: string;
          local_name: string | null;
          scientific_name: string | null;
          image_url: string | null;
          description: string | null;
          preferred_conditions: Json | null;
        };
        Insert: {
          id?: string;
          common_name: string;
          local_name?: string | null;
          scientific_name?: string | null;
          image_url?: string | null;
          description?: string | null;
          preferred_conditions?: Json | null;
        };
        Update: Partial<Database['public']['Tables']['species']['Insert']>;
      };
      spot_species: {
        Row: {
          spot_id: string;
          species_id: string;
          season_months: number[] | null;
          prevalence: Prevalence | null;
          notes: string | null;
        };
        Insert: {
          spot_id: string;
          species_id: string;
          season_months?: number[] | null;
          prevalence?: Prevalence | null;
          notes?: string | null;
        };
        Update: Partial<Database['public']['Tables']['spot_species']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      spot_type: SpotType;
      difficulty_level: DifficultyLevel;
      prevalence: Prevalence;
    };
  };
}
