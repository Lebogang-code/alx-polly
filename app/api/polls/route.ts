import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { CreatePollRequest } from '@/app/types';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body: CreatePollRequest = await request.json();
    
    // Validate required fields
    if (!body.title || !body.options || body.options.length < 2) {
      return NextResponse.json(
        { error: 'Title and at least two options are required' },
        { status: 400 }
      );
    }

    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    let token = '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Fallback to cookies if no Authorization header
      const cookieStore = cookies();
      token = cookieStore.get('sb-access-token')?.value || '';
    }
    
    if (!token) {
      return NextResponse.json(
        { error: 'You must be logged in to create a poll' },
        { status: 401 }
      );
    }

    // Create authenticated Supabase client
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to create a poll' },
        { status: 401 }
      );
    }

    // Start a transaction
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        title: body.title,
        description: body.description || null,
        is_active: true,
        created_by: user.id,
        expires_at: body.expiresAt || null
      })
      .select()
      .single();

    if (pollError) {
      console.error('Error creating poll:', pollError);
      return NextResponse.json(
        { error: 'Failed to create poll' },
        { status: 500 }
      );
    }

    // Insert poll options
    const pollOptions = body.options.map(text => ({
      poll_id: poll.id,
      text
    }));

    const { data: options, error: optionsError } = await supabase
      .from('poll_options')
      .insert(pollOptions)
      .select();

    if (optionsError) {
      console.error('Error creating poll options:', optionsError);
      // Attempt to clean up the poll if options creation fails
      await supabase.from('polls').delete().eq('id', poll.id);
      
      return NextResponse.json(
        { error: 'Failed to create poll options' },
        { status: 500 }
      );
    }

    // Return the created poll with options
    return NextResponse.json({
      id: poll.id,
      title: poll.title,
      description: poll.description,
      options: options,
      isActive: poll.is_active,
      createdBy: poll.created_by,
      createdAt: poll.created_at,
      expiresAt: poll.expires_at
    });

  } catch (error) {
    console.error('Unexpected error creating poll:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('poll_details')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching polls:', error);
      return NextResponse.json(
        { error: 'Failed to fetch polls' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error fetching polls:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}