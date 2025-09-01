# Supabase Database Schema Documentation

This document describes the database schema design for the ALX Polly polling application.

## Overview

The database schema consists of the following main tables:

1. **profiles** - User profiles information
2. **polls** - Poll information
3. **poll_options** - Options for each poll
4. **votes** - User votes on poll options

Additionally, there are views and functions to simplify common operations.

## Tables

### profiles

Stores user profile information. This table extends Supabase's built-in `auth.users` table.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, references auth.users(id) |
| email | TEXT | User's email address |
| name | TEXT | User's display name |
| avatar | TEXT | URL to user's avatar image (optional) |
| created_at | TIMESTAMP | When the profile was created |
| updated_at | TIMESTAMP | When the profile was last updated |

### polls

Stores information about polls created by users.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| title | TEXT | Poll title/question |
| description | TEXT | Optional description of the poll |
| is_active | BOOLEAN | Whether the poll is currently active |
| created_by | UUID | References profiles(id) of the creator |
| created_at | TIMESTAMP | When the poll was created |
| expires_at | TIMESTAMP | When the poll expires (optional) |
| updated_at | TIMESTAMP | When the poll was last updated |

### poll_options

Stores the options available for each poll.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| poll_id | UUID | References polls(id) |
| text | TEXT | The option text |
| created_at | TIMESTAMP | When the option was created |
| updated_at | TIMESTAMP | When the option was last updated |

### votes

Stores user votes on poll options.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| poll_id | UUID | References polls(id) |
| option_id | UUID | References poll_options(id) |
| user_id | UUID | References profiles(id) |
| created_at | TIMESTAMP | When the vote was cast |

A unique constraint ensures a user can only vote once per poll.

## Views

### poll_details

Provides poll information with vote counts and creator details.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Poll ID |
| title | TEXT | Poll title |
| description | TEXT | Poll description |
| is_active | BOOLEAN | Poll active status |
| created_by | UUID | Creator's ID |
| created_at | TIMESTAMP | Creation timestamp |
| expires_at | TIMESTAMP | Expiration timestamp |
| total_votes | BIGINT | Total number of votes |
| creator_name | TEXT | Name of the poll creator |

### poll_options_with_stats

Provides poll options with vote counts and percentages.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Option ID |
| poll_id | UUID | Poll ID |
| text | TEXT | Option text |
| votes | BIGINT | Number of votes for this option |
| percentage | NUMERIC | Percentage of total votes |

## Functions

### is_poll_active(poll_id UUID)

Checks if a poll is active based on its active status and expiration date.

### cast_vote(p_poll_id UUID, p_option_id UUID, p_user_id UUID)

Casts a vote for a user on a specific poll option. If the user has already voted on this poll, their vote is updated.

## Row Level Security (RLS) Policies

The schema implements Row Level Security to ensure data access control:

### profiles
- Anyone can view profiles
- Users can only update their own profile

### polls
- Anyone can view polls
- Only authenticated users can create polls
- Users can only update/delete their own polls

### poll_options
- Anyone can view poll options
- Only poll creators can insert/update/delete options

### votes
- Anyone can view votes
- Only authenticated users can vote on active polls
- Users can only delete their own votes

## Relationships

```
profiles 1 --- * polls (created_by)
 polls 1 --- * poll_options
 polls 1 --- * votes
 poll_options 1 --- * votes
 profiles 1 --- * votes
```

## Triggers

Triggers are used to automatically update the `updated_at` timestamp whenever a record is updated in the following tables:
- profiles
- polls
- poll_options