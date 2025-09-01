import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { cookies } from 'next/headers';

// Vote on a poll
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: pollId } = params;
    const { optionId } = await request.json();

    if (!optionId) {
      return NextResponse.json(
        { error: 'Option ID is required' },
        { status: 400 }
      );
    }

    // Get the user session
    const cookieStore = cookies();
    const supabaseToken = cookieStore.get('sb-access-token')?.value;
    
    if (!supabaseToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create authenticated Supabase client
    const { data: { user } } = await supabase.auth.getUser(supabaseToken);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if poll exists and is active
    const { data: isPollActive, error: pollActiveError } = await supabase
      .rpc('is_poll_active', { poll_id: pollId });

    if (pollActiveError) {
      return NextResponse.json(
        { error: 'Failed to check poll status' },
        { status: 500 }
      );
    }

    if (!isPollActive) {
      return NextResponse.json(
        { error: 'This poll is not active' },
        { status: 400 }
      );
    }

    // Check if option belongs to the poll
    const { data: option, error: optionError } = await supabase
      .from('poll_options')
      .select('id')
      .eq('id', optionId)
      .eq('poll_id', pollId)
      .single();

    if (optionError || !option) {
      return NextResponse.json(
        { error: 'Invalid option for this poll' },
        { status: 400 }
      );
    }

    // Use the cast_vote function to handle the vote
    const { data: voteId, error: voteError } = await supabase
      .rpc('cast_vote', {
        p_poll_id: pollId,
        p_option_id: optionId,
        p_user_id: user.id
      });

    if (voteError) {
      return NextResponse.json(
        { error: voteError.message || 'Failed to cast vote' },
        { status: 500 }
      );
    }

    // Get updated poll options with stats
    const { data: updatedOptions } = await supabase
      .from('poll_options_with_stats')
      .select('*')
      .eq('poll_id', pollId);

    return NextResponse.json({
      success: true,
      voteId,
      options: updatedOptions || []
    });
  } catch (error) {
    console.error('Unexpected error voting on poll:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Get user's vote on a poll
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: pollId } = params;

    // Get the user session
    const cookieStore = cookies();
    const supabaseToken = cookieStore.get('sb-access-token')?.value;
    
    if (!supabaseToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create authenticated Supabase client
    const { data: { user } } = await supabase.auth.getUser(supabaseToken);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's vote on this poll
    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .select('id, option_id, created_at')
      .eq('poll_id', pollId)
      .eq('user_id', user.id)
      .single();

    if (voteError && voteError.code !== 'PGRST116') { // PGRST116 means no rows returned
      return NextResponse.json(
        { error: 'Failed to fetch vote' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      hasVoted: !!vote,
      vote: vote || null
    });
  } catch (error) {
    console.error('Unexpected error fetching vote:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Delete a vote
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: pollId } = params;

    // Get the user session
    const cookieStore = cookies();
    const supabaseToken = cookieStore.get('sb-access-token')?.value;
    
    if (!supabaseToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create authenticated Supabase client
    const { data: { user } } = await supabase.auth.getUser(supabaseToken);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Delete the vote
    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .eq('poll_id', pollId)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete vote' },
        { status: 500 }
      );
    }

    // Get updated poll options with stats
    const { data: updatedOptions } = await supabase
      .from('poll_options_with_stats')
      .select('*')
      .eq('poll_id', pollId);

    return NextResponse.json({
      success: true,
      options: updatedOptions || []
    });
  } catch (error) {
    console.error('Unexpected error deleting vote:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}