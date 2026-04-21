export type ArticleSource = 'manual' | 'agent_search' | 'import'

export interface ArticleMeta {
  title: string
  slug: string
  date: string
  tags: string[]
  keywords: string[]
  summary: string
  source: ArticleSource
  read_time: number
}

export interface ArticleWithContent extends ArticleMeta {
  content: string
}

export interface CheckinRecord {
  checked: boolean
  study_seconds: number
  articles_read: string[]
}

export interface StreakState {
  count: number
  last_date: string
  longest: number
}

export interface ArticleProgress {
  completed: boolean
  progress: number
  date: string
}

export interface DailyStats {
  streak: StreakState
  checkin: CheckinRecord
  total_articles: number
  completed_articles: number
}

export type ModelId = 'qwen-max' | 'gpt-4o' | 'claude-sonnet'
