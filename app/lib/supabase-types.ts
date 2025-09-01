// Supabase database types for type safety

export type Profile = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
};

export type Poll = {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  expires_at?: string;
  updated_at: string;
};

export type PollOption = {
  id: string;
  poll_id: string;
  text: string;
  created_at: string;
  updated_at: string;
};

export type Vote = {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
};

// View types
export type PollDetails = {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  expires_at?: string;
  total_votes: number;
  creator_name: string;
};

export type PollOptionWithStats = {
  id: string;
  poll_id: string;
  text: string;
  votes: number;
  percentage: number;
};

// Database schema type
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'created_at' | 'updated_at'>>;
      };
      polls: {
        Row: Poll;
        Insert: Omit<Poll, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Poll, 'id' | 'created_at' | 'updated_at'>>;
      };
      poll_options: {
        Row: PollOption;
        Insert: Omit<PollOption, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PollOption, 'id' | 'created_at' | 'updated_at'>>;
      };
      votes: {
        Row: Vote;
        Insert: Omit<Vote, 'id' | 'created_at'>;
        Update: Partial<Omit<Vote, 'id' | 'created_at'>>;
      };
    };
    Views: {
      poll_details: {
        Row: PollDetails;
      };
      poll_options_with_stats: {
        Row: PollOptionWithStats;
      };
    };
    Functions: {
      is_poll_active: {
        Args: { poll_id: string };
        Returns: boolean;
      };
      cast_vote: {
        Args: { 
          p_poll_id: string;
          p_option_id: string;
          p_user_id: string;
        };
        Returns: string;
      };
    };
  };
};