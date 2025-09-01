import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { cookies } from 'next/headers';

// Get a specific poll with its options and stats
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Get poll details
    const { data: poll, error: pollError } = await supabase
      .from('poll_details')
      .select('*')
      .eq('id', id)
      .single();

    if (pollError) {
      if (pollError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch poll' }, { status: 500 });
    }

    // Get poll options with stats
    const { data: options, error: optionsError } = await supabase
      .from('poll_options_with_stats')
      .select('*')
      .eq('poll_id', id);

    if (optionsError) {
      return NextResponse.json({ error: 'Failed to fetch poll options' }, { status: 500 });
    }

    // Check if user has voted on this poll
    let userVote = null;
    const cookieStore = cookies();
    const supabaseToken = cookieStore.get('sb-access-token')?.value;
    
    if (supabaseToken) {
      const { data: { user } } = await supabase.auth.getUser(supabaseToken);
      
      if (user) {
        const { data: vote } = await supabase
          .from('votes')
          .select('option_id')
          .eq('poll_id', id)
          .eq('user_id', user.id)
          .single();
        
        userVote = vote ? vote.option_id : null;
      }
    }

    return NextResponse.json({
      ...poll,
      options,
      userVote
    });
  } catch (error) {
    console.error('Unexpected error fetching poll:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Delete a poll
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Check for Authorization header (client-side requests)
    let user;
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: userData } = await supabase.auth.getUser(token);
      user = userData?.user;
    }
    
    // If no Authorization header or invalid token, try cookies (server-side requests)
    if (!user) {
      const cookieStore = cookies();
      const supabaseToken = cookieStore.get('sb-access-token')?.value;
      
      if (supabaseToken) {
        const { data: userData } = await supabase.auth.getUser(supabaseToken);
        user = userData?.user;
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if the poll exists and belongs to the user
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('created_by')
      .eq('id', id)
      .single();

    if (pollError) {
      if (pollError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch poll' }, { status: 500 });
    }

    if (poll.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this poll' },
        { status: 403 }
      );
    }

    // Delete the poll (cascade will handle options and votes)
    const { error: deleteError } = await supabase
      .from('polls')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete poll' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error deleting poll:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Update a poll (e.g., activate/deactivate)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();

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

    // Check if the poll exists and belongs to the user
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('created_by')
      .eq('id', id)
      .single();

    if (pollError) {
      if (pollError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch poll' }, { status: 500 });
    }

    if (poll.created_by !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this poll' },
        { status: 403 }
      );
    }

    // Update the poll
    const updateData: any = {};
    
    // Only allow specific fields to be updated
    if (body.isActive !== undefined) updateData.is_active = body.isActive;
    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.expiresAt !== undefined) updateData.expires_at = body.expiresAt;

    const { data: updatedPoll, error: updateError } = await supabase
      .from('polls')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    // Update poll options if provided
    if (body.options && Array.isArray(body.options)) {
      // Process each option
      for (const option of body.options) {
        if (option.id && option.id.startsWith('new-')) {
          // This is a new option, insert it
          await supabase
            .from('poll_options')
            .insert({
              poll_id: id,
              text: option.text
            });
        } else if (option.id) {
          // This is an existing option, update it
          await supabase
            .from('poll_options')
            .update({ text: option.text })
            .eq('id', option.id)
            .eq('poll_id', id);
        }
      }
      
      // Get the current options from the database
      const { data: currentOptions } = await supabase
        .from('poll_options')
        .select('id')
        .eq('poll_id', id);
      
      if (currentOptions) {
        // Find options that were removed (in database but not in the update request)
        const updatedOptionIds = body.options.map(o => o.id).filter(id => !id.startsWith('new-'));
        const optionsToDelete = currentOptions.filter(o => !updatedOptionIds.includes(o.id));
        
        // Delete removed options if they don't have votes
        for (const option of optionsToDelete) {
          // Check if option has votes
          const { count } = await supabase
            .from('votes')
            .select('id', { count: 'exact' })
            .eq('option_id', option.id);
          
          // Only delete if no votes exist
          if (count === 0) {
            await supabase
              .from('poll_options')
              .delete()
              .eq('id', option.id)
              .eq('poll_id', id);
          }
        }
      }
    }

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update poll' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedPoll);
  } catch (error) {
    console.error('Unexpected error updating poll:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}