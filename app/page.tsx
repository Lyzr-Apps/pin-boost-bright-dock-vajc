'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { copyToClipboard } from '@/lib/clipboard'
import { listSchedules, getSchedule, getScheduleLogs, pauseSchedule, resumeSchedule, triggerScheduleNow, cronToHuman, type Schedule, type ExecutionLog } from '@/lib/scheduler'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts'

import { FiHome, FiPlus, FiBarChart2, FiCalendar, FiSettings, FiImage, FiSend, FiClock, FiTrendingUp, FiEye, FiHeart, FiExternalLink, FiEdit2, FiTrash2, FiSearch, FiFilter, FiChevronLeft, FiChevronRight, FiMenu, FiX, FiCheck, FiAlertCircle, FiCopy, FiDownload, FiTag, FiHash, FiLink, FiGrid, FiList, FiChevronDown, FiChevronUp, FiPlay, FiPause, FiRefreshCw, FiLayers, FiZap, FiStar, FiShare2 } from 'react-icons/fi'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIN_CONTENT_MANAGER_ID = '6998740bad9589c32de455e4'
const PINTEREST_IMAGE_AGENT_ID = '6998740ba60f376149e49302'
const PINTEREST_PUBLISHER_ID = '6998741cbc8dca6f8c9eb973'
const SCHEDULE_ID = '69987421399dfadeac37ce49'

const AGENTS = [
  { id: PIN_CONTENT_MANAGER_ID, name: 'Pin Content Manager', purpose: 'Extracts product data and optimizes content' },
  { id: PINTEREST_IMAGE_AGENT_ID, name: 'Pinterest Image Agent', purpose: 'Generates Pinterest-optimized images' },
  { id: PINTEREST_PUBLISHER_ID, name: 'Pinterest Publisher', purpose: 'Connects to Pinterest API to publish pins with product links (PINTEREST_LIST_BOARDS, PINTEREST_CREATE_PIN)' },
]

const MOCK_BOARDS = [
  'Home Decor Inspiration',
  'Fashion Finds',
  'Kitchen Essentials',
  'Gift Ideas',
  'Tech Gadgets',
  'Beauty Picks',
  'Fitness Gear',
  'Travel Must-Haves',
]

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface PinContentResult {
  product_title?: string
  product_description?: string
  price?: string
  sale_price?: string
  brand?: string
  image_urls?: string[]
  features?: string[]
  category?: string
  pinterest_title?: string
  pinterest_description?: string
  hashtags?: string[]
  keyword_tags?: string[]
  formatted_url?: string
  seo_score?: string
}

interface PublishResult {
  publish_status?: string
  pin_url?: string
  board_name?: string
  published_at?: string
  pin_id?: string
  message?: string
  destination_link?: string
}

interface StatusMessage {
  type: 'success' | 'error' | 'info'
  text: string
}

interface DraftPin {
  id: string
  title: string
  description: string
  hashtags: string[]
  keyword_tags: string[]
  image_url: string
  formatted_url: string
  product_title: string
  brand: string
  price: string
  sale_price: string
  category: string
  seo_score: string
  board: string
  status: 'draft' | 'published' | 'scheduled'
  created_at: string
  published_at?: string
  pin_url?: string
}

interface BulkPinItem {
  url: string
  status: 'pending' | 'extracting' | 'generated' | 'ready' | 'published' | 'error'
  data?: PinContentResult
  error?: string
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_RECENT_PINS: DraftPin[] = [
  { id: 'm1', title: 'Minimalist Ceramic Vase Set', description: 'Handcrafted elegance for modern interiors. These ceramic vases bring warmth and sophistication to any room.', hashtags: ['#homedecor', '#ceramics', '#minimalist'], keyword_tags: ['vase', 'ceramic', 'decor'], image_url: '', formatted_url: 'https://example.com/vase', product_title: 'Ceramic Vase Set', brand: 'Artisan Home', price: '$89.00', sale_price: '$69.00', category: 'Home Decor', seo_score: '92', board: 'Home Decor Inspiration', status: 'published', created_at: '2026-02-18T10:30:00Z', published_at: '2026-02-18T11:00:00Z', pin_url: 'https://pinterest.com/pin/123' },
  { id: 'm2', title: 'Organic Linen Throw Blanket', description: 'Luxuriously soft organic linen throw. Perfect for cozy evenings and elegant living spaces.', hashtags: ['#organic', '#linen', '#cozy'], keyword_tags: ['blanket', 'throw', 'organic'], image_url: '', formatted_url: 'https://example.com/blanket', product_title: 'Linen Throw Blanket', brand: 'Pure Living', price: '$120.00', sale_price: '$95.00', category: 'Home Textiles', seo_score: '88', board: 'Home Decor Inspiration', status: 'published', created_at: '2026-02-17T14:00:00Z', published_at: '2026-02-17T15:00:00Z' },
  { id: 'm3', title: 'Gold Accent Table Lamp', description: 'A statement piece that combines modern design with timeless gold accents.', hashtags: ['#lighting', '#gold', '#modern'], keyword_tags: ['lamp', 'table lamp', 'gold'], image_url: '', formatted_url: 'https://example.com/lamp', product_title: 'Gold Table Lamp', brand: 'Luxe Light', price: '$145.00', sale_price: '', category: 'Lighting', seo_score: '85', board: 'Home Decor Inspiration', status: 'scheduled', created_at: '2026-02-19T09:00:00Z' },
  { id: 'm4', title: 'Handwoven Basket Storage Set', description: 'Natural seagrass baskets for elegant and organized living spaces.', hashtags: ['#storage', '#handwoven', '#natural'], keyword_tags: ['basket', 'storage', 'seagrass'], image_url: '', formatted_url: 'https://example.com/basket', product_title: 'Seagrass Basket Set', brand: 'Nature Craft', price: '$65.00', sale_price: '$52.00', category: 'Storage', seo_score: '90', board: 'Home Decor Inspiration', status: 'draft', created_at: '2026-02-19T16:00:00Z' },
  { id: 'm5', title: 'Velvet Accent Cushion Duo', description: 'Rich velvet cushions in champagne gold. The perfect finishing touch for any sofa.', hashtags: ['#velvet', '#cushion', '#luxury'], keyword_tags: ['cushion', 'pillow', 'velvet'], image_url: '', formatted_url: 'https://example.com/cushion', product_title: 'Velvet Cushion Set', brand: 'Soft Touch', price: '$55.00', sale_price: '', category: 'Textiles', seo_score: '87', board: 'Home Decor Inspiration', status: 'draft', created_at: '2026-02-20T08:00:00Z' },
]

const MOCK_ANALYTICS_DATA = [
  { day: 'Feb 14', clicks: 120, saves: 85, impressions: 2400 },
  { day: 'Feb 15', clicks: 145, saves: 92, impressions: 2800 },
  { day: 'Feb 16', clicks: 132, saves: 78, impressions: 2650 },
  { day: 'Feb 17', clicks: 168, saves: 110, impressions: 3200 },
  { day: 'Feb 18', clicks: 195, saves: 125, impressions: 3800 },
  { day: 'Feb 19', clicks: 210, saves: 140, impressions: 4100 },
  { day: 'Feb 20', clicks: 188, saves: 118, impressions: 3600 },
]

const CHART_CONFIG = {
  clicks: { label: 'Clicks', color: 'hsl(40 30% 45%)' },
  saves: { label: 'Saves', color: 'hsl(30 20% 35%)' },
  impressions: { label: 'Impressions', color: 'hsl(200 15% 45%)' },
}

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-medium mb-2 tracking-widest">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-6 py-2 bg-primary text-primary-foreground text-sm tracking-widest">Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Markdown renderer
// ---------------------------------------------------------------------------

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-medium">{part}</strong> : part
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-medium text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-medium text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-medium text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper: generate ID
// ---------------------------------------------------------------------------

function generateId() {
  return Math.random().toString(36).substring(2, 10)
}

// ---------------------------------------------------------------------------
// Inline Components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    published: 'bg-green-100 text-green-800 border-green-200',
    scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
    draft: 'bg-muted text-muted-foreground border-border',
    extracting: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    generated: 'bg-primary/10 text-primary border-primary/30',
    ready: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-muted text-muted-foreground border-border',
    error: 'bg-red-100 text-red-800 border-red-200',
    active: 'bg-green-100 text-green-800 border-green-200',
    paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 text-xs tracking-wider border', variants[status] || 'bg-muted text-muted-foreground border-border')}>
      {status.toUpperCase()}
    </span>
  )
}

function StatCard({ label, value, trend, icon }: { label: string; value: string; trend?: string; icon: React.ReactNode }) {
  const isPositive = trend?.startsWith('+')
  return (
    <Card className="border border-border bg-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs tracking-widest text-muted-foreground uppercase mb-2">{label}</p>
            <p className="text-2xl font-medium tracking-wider">{value}</p>
            {trend && (
              <p className={cn('text-xs mt-1 tracking-wider', isPositive ? 'text-green-600' : 'text-red-600')}>
                {trend} vs last period
              </p>
            )}
          </div>
          <div className="text-primary/60">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function SeoScoreDisplay({ score }: { score: string }) {
  const numScore = parseInt(score) || 0
  const color = numScore >= 90 ? 'text-green-600' : numScore >= 70 ? 'text-yellow-600' : 'text-red-600'
  return (
    <div className="flex items-center gap-3">
      <div className={cn('text-2xl font-medium tracking-wider', color)}>{numScore}</div>
      <div className="flex-1">
        <p className="text-xs tracking-widest text-muted-foreground uppercase mb-1">SEO Score</p>
        <Progress value={numScore} className="h-1.5" />
      </div>
    </div>
  )
}

function TagChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-border bg-secondary text-secondary-foreground text-xs tracking-wider">
      {label}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:text-destructive transition-colors">
          <FiX size={10} />
        </button>
      )}
    </span>
  )
}

function PinPreviewCard({ title, description, imageUrl, brand }: { title: string; description: string; imageUrl?: string; brand?: string }) {
  return (
    <div className="border border-primary/30 bg-card overflow-hidden max-w-xs mx-auto">
      <div className="aspect-[2/3] bg-muted flex items-center justify-center relative overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={title || 'Pin preview'} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center p-6">
            <FiImage size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-xs tracking-widest text-muted-foreground">PIN PREVIEW</p>
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        {brand && <p className="text-[10px] tracking-widest text-muted-foreground uppercase">{brand}</p>}
        <h3 className="font-medium text-sm tracking-wider line-clamp-2">{title || 'Pin Title'}</h3>
        <p className="text-xs text-muted-foreground line-clamp-3">{description || 'Pin description will appear here...'}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function Page() {
  // Navigation
  const [activeScreen, setActiveScreen] = useState<string>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Sample data toggle
  const [showSampleData, setShowSampleData] = useState(false)

  // Pin Generation
  const [pinData, setPinData] = useState<PinContentResult | null>(null)
  const [generatingPin, setGeneratingPin] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)

  // Form state
  const [productUrl, setProductUrl] = useState('')
  const [affiliateEnabled, setAffiliateEnabled] = useState(false)
  const [affiliateId, setAffiliateId] = useState('')
  const [utmSource, setUtmSource] = useState('')
  const [utmMedium, setUtmMedium] = useState('')
  const [utmCampaign, setUtmCampaign] = useState('')
  const [utmOpen, setUtmOpen] = useState(false)

  // Editable pin fields
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editHashtags, setEditHashtags] = useState<string[]>([])
  const [editKeywordTags, setEditKeywordTags] = useState<string[]>([])
  const [selectedBoard, setSelectedBoard] = useState('')
  const [newHashtag, setNewHashtag] = useState('')
  const [newKeywordTag, setNewKeywordTag] = useState('')
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  // Pinterest boards (fetched from API via publisher agent)
  const [pinterestBoards, setPinterestBoards] = useState<string[]>([])
  const [fetchingBoards, setFetchingBoards] = useState(false)
  const [boardsFetched, setBoardsFetched] = useState(false)

  // Bulk mode
  const [bulkUrls, setBulkUrls] = useState('')
  const [bulkPins, setBulkPins] = useState<BulkPinItem[]>([])
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [expandedBulkRow, setExpandedBulkRow] = useState<number | null>(null)

  // Pins storage
  const [draftPins, setDraftPins] = useState<DraftPin[]>([])
  const [publishedPins, setPublishedPins] = useState<DraftPin[]>([])

  // Status message
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)

  // Active agent tracking
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Schedule state
  const [scheduleData, setScheduleData] = useState<Schedule | null>(null)
  const [scheduleLogs, setScheduleLogs] = useState<ExecutionLog[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)

  // Dashboard filter
  const [dashboardFilter, setDashboardFilter] = useState<string>('all')

  // Analytics
  const [analyticsRange, setAnalyticsRange] = useState('7d')

  // Settings
  const [defaultAffiliateId, setDefaultAffiliateId] = useState('')
  const [defaultUtmSource, setDefaultUtmSource] = useState('pinterest')
  const [defaultUtmMedium, setDefaultUtmMedium] = useState('social')
  const [defaultUtmCampaign, setDefaultUtmCampaign] = useState('pinpost')
  const [notifyOnPublish, setNotifyOnPublish] = useState(true)
  const [notifyOnSchedule, setNotifyOnSchedule] = useState(true)

  // Auto-dismiss status messages
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [statusMessage])

  // Load schedule data when navigating to scheduled screen
  const loadScheduleData = useCallback(async () => {
    setScheduleLoading(true)
    try {
      const [schedResult, logsResult] = await Promise.all([
        getSchedule(SCHEDULE_ID),
        getScheduleLogs(SCHEDULE_ID, { limit: 10 }),
      ])
      if (schedResult.success && schedResult.schedule) {
        setScheduleData(schedResult.schedule)
      }
      if (logsResult.success) {
        setScheduleLogs(Array.isArray(logsResult.executions) ? logsResult.executions : [])
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to load schedule data' })
    }
    setScheduleLoading(false)
  }, [])

  useEffect(() => {
    if (activeScreen === 'scheduled') {
      loadScheduleData()
    }
  }, [activeScreen, loadScheduleData])

  // Sample data population
  useEffect(() => {
    if (showSampleData) {
      setDraftPins(MOCK_RECENT_PINS.filter(p => p.status === 'draft'))
      setPublishedPins(MOCK_RECENT_PINS.filter(p => p.status === 'published'))
    } else {
      setDraftPins([])
      setPublishedPins([])
    }
  }, [showSampleData])

  // Combine all pins for dashboard
  const allPins = [...publishedPins, ...draftPins, ...(showSampleData ? MOCK_RECENT_PINS.filter(p => p.status === 'scheduled') : [])]
  const filteredPins = dashboardFilter === 'all' ? allPins : allPins.filter(p => p.status === dashboardFilter)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleGeneratePin = async () => {
    if (!productUrl.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a product URL' })
      return
    }
    setGeneratingPin(true)
    setActiveAgentId(PIN_CONTENT_MANAGER_ID)
    setStatusMessage({ type: 'info', text: 'Extracting product data and optimizing content...' })

    let message = `Extract product data and generate optimized Pinterest content for this product URL: ${productUrl}`
    if (affiliateEnabled && affiliateId) {
      message += `\n\nAffiliate ID: ${affiliateId}`
    }
    if (utmSource || utmMedium || utmCampaign) {
      message += `\n\nUTM Parameters - Source: ${utmSource || 'pinterest'}, Medium: ${utmMedium || 'social'}, Campaign: ${utmCampaign || 'pinpost'}`
    }

    const result = await callAIAgent(message, PIN_CONTENT_MANAGER_ID)

    if (result.success && result.response?.status === 'success') {
      const data = result.response.result as PinContentResult
      setPinData(data)
      setEditTitle(data?.pinterest_title || '')
      setEditDescription(data?.pinterest_description || '')
      setEditHashtags(Array.isArray(data?.hashtags) ? data.hashtags : [])
      setEditKeywordTags(Array.isArray(data?.keyword_tags) ? data.keyword_tags : [])
      setSelectedImageIndex(0)
      setGeneratedImageUrl(null)
      setActiveScreen('review')
      setStatusMessage({ type: 'success', text: 'Pin content generated successfully!' })
    } else {
      setStatusMessage({ type: 'error', text: result.response?.message || result.error || 'Failed to generate pin content' })
    }

    setGeneratingPin(false)
    setActiveAgentId(null)
  }

  const handleGenerateImage = async () => {
    if (!pinData) return
    setGeneratingImage(true)
    setActiveAgentId(PINTEREST_IMAGE_AGENT_ID)
    setStatusMessage({ type: 'info', text: 'Generating Pinterest-optimized image...' })

    const message = `Generate a vertical 2:3 ratio Pinterest pin image for: ${pinData?.product_title ?? 'Product'}. Description: ${pinData?.product_description ?? ''}. Category: ${pinData?.category ?? ''}. Style it in a trendy, eye-catching way suitable for Pinterest.`

    const result = await callAIAgent(message, PINTEREST_IMAGE_AGENT_ID)

    if (result.success) {
      const files = Array.isArray(result.module_outputs?.artifact_files) ? result.module_outputs.artifact_files : []
      const imageUrl = files?.[0]?.file_url
      if (imageUrl) {
        setGeneratedImageUrl(imageUrl)
        setStatusMessage({ type: 'success', text: 'Image generated successfully!' })
      } else {
        setStatusMessage({ type: 'error', text: 'Image generation completed but no image URL returned' })
      }
    } else {
      setStatusMessage({ type: 'error', text: result.response?.message || 'Failed to generate image' })
    }

    setGeneratingImage(false)
    setActiveAgentId(null)
  }

  const handleFetchBoards = async () => {
    setFetchingBoards(true)
    setStatusMessage({ type: 'info', text: 'Fetching your Pinterest boards...' })
    setActiveAgentId(PINTEREST_PUBLISHER_ID)

    const result = await callAIAgent(
      'List all my Pinterest boards. Return the board names so I can select one for publishing. Just list the boards, do not create any pins.',
      PINTEREST_PUBLISHER_ID
    )

    if (result.success && result.response?.status === 'success') {
      const data = result.response.result
      const msg = data?.message || result.response?.message || ''
      // Try to extract board names from the response
      const boardNames: string[] = []
      if (data?.board_name && data.board_name !== '') {
        boardNames.push(data.board_name)
      }
      // Parse board names from the message text which typically lists them
      if (msg) {
        const lines = msg.split('\n').filter((l: string) => l.trim())
        lines.forEach((line: string) => {
          const cleaned = line.replace(/^[-*\d.)\s]+/, '').trim()
          if (cleaned && cleaned.length > 1 && cleaned.length < 100) {
            boardNames.push(cleaned)
          }
        })
      }
      if (boardNames.length > 0) {
        setPinterestBoards(boardNames)
        setBoardsFetched(true)
        setStatusMessage({ type: 'success', text: `Found ${boardNames.length} Pinterest boards` })
      } else {
        // Fallback - the agent may have returned boards differently
        setPinterestBoards(['Default Board'])
        setBoardsFetched(true)
        setStatusMessage({ type: 'info', text: 'Connected to Pinterest. Using default board.' })
      }
    } else {
      setStatusMessage({ type: 'error', text: 'Could not fetch boards. Please verify your Pinterest connection in Lyzr Studio.' })
    }

    setFetchingBoards(false)
    setActiveAgentId(null)
  }

  const handlePublishPin = async () => {
    setPublishing(true)
    setActiveAgentId(PINTEREST_PUBLISHER_ID)
    setStatusMessage({ type: 'info', text: 'Publishing pin to Pinterest via API...' })

    const imageUrls = Array.isArray(pinData?.image_urls) ? pinData.image_urls : []
    const pinImageUrl = generatedImageUrl || (imageUrls[selectedImageIndex] || imageUrls[0] || '')
    const destinationLink = pinData?.formatted_url || productUrl
    const hashtagsStr = Array.isArray(editHashtags) ? editHashtags.join(' ') : ''
    const fullDescription = editDescription + (hashtagsStr ? '\n\n' + hashtagsStr : '')

    const message = `Create and publish a Pinterest pin with these EXACT details:

BOARD NAME: ${selectedBoard || 'Use my first available board'}
TITLE: ${editTitle}
DESCRIPTION: ${fullDescription}
IMAGE URL: ${pinImageUrl}
DESTINATION LINK: ${destinationLink}

IMPORTANT:
- You MUST use the PINTEREST_LIST_BOARDS tool first to get the board_id for "${selectedBoard || 'first available board'}"
- Then use PINTEREST_CREATE_PIN to create the pin with ALL the above details
- The destination link "${destinationLink}" MUST be attached as the pin's link so clicks go to the product page
- The image at "${pinImageUrl}" MUST be used as the pin's media source`

    const result = await callAIAgent(message, PINTEREST_PUBLISHER_ID)

    if (result.success && result.response?.status === 'success') {
      const pubData = result.response.result as PublishResult
      const newPin: DraftPin = {
        id: generateId(),
        title: editTitle,
        description: editDescription,
        hashtags: editHashtags,
        keyword_tags: editKeywordTags,
        image_url: pinImageUrl,
        formatted_url: destinationLink,
        product_title: pinData?.product_title || '',
        brand: pinData?.brand || '',
        price: pinData?.price || '',
        sale_price: pinData?.sale_price || '',
        category: pinData?.category || '',
        seo_score: pinData?.seo_score || '',
        board: pubData?.board_name || selectedBoard || 'Default Board',
        status: 'published',
        created_at: new Date().toISOString(),
        published_at: pubData?.published_at || new Date().toISOString(),
        pin_url: pubData?.pin_url,
      }
      setPublishedPins(prev => [newPin, ...prev])
      setStatusMessage({ type: 'success', text: `Pin published to Pinterest! ${pubData?.pin_url ? 'View at: ' + pubData.pin_url : ''} ${pubData?.message || ''}` })
      setPinData(null)
      setGeneratedImageUrl(null)
      setProductUrl('')
      setActiveScreen('dashboard')
    } else {
      setStatusMessage({ type: 'error', text: result.response?.message || result.error || 'Failed to publish pin. Please verify your Pinterest connection in Lyzr Studio.' })
    }

    setPublishing(false)
    setActiveAgentId(null)
  }

  const handleSaveDraft = () => {
    if (!editTitle) {
      setStatusMessage({ type: 'error', text: 'Please enter a title before saving' })
      return
    }
    const imageUrls = Array.isArray(pinData?.image_urls) ? pinData.image_urls : []
    const draft: DraftPin = {
      id: generateId(),
      title: editTitle,
      description: editDescription,
      hashtags: editHashtags,
      keyword_tags: editKeywordTags,
      image_url: generatedImageUrl || imageUrls[0] || '',
      formatted_url: pinData?.formatted_url || productUrl,
      product_title: pinData?.product_title || '',
      brand: pinData?.brand || '',
      price: pinData?.price || '',
      sale_price: pinData?.sale_price || '',
      category: pinData?.category || '',
      seo_score: pinData?.seo_score || '',
      board: selectedBoard || '',
      status: 'draft',
      created_at: new Date().toISOString(),
    }
    setDraftPins(prev => [draft, ...prev])
    setStatusMessage({ type: 'success', text: 'Draft saved successfully!' })
    setPinData(null)
    setGeneratedImageUrl(null)
    setProductUrl('')
    setActiveScreen('dashboard')
  }

  const handleBulkGenerate = async () => {
    const urls = bulkUrls.split('\n').map(u => u.trim()).filter(u => u.length > 0)
    if (urls.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please enter at least one URL' })
      return
    }
    setBulkProcessing(true)
    const items: BulkPinItem[] = urls.map(url => ({ url, status: 'pending' }))
    setBulkPins(items)

    for (let i = 0; i < items.length; i++) {
      setBulkPins(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'extracting' } : item))
      setActiveAgentId(PIN_CONTENT_MANAGER_ID)

      const result = await callAIAgent(
        `Extract product data and generate optimized Pinterest content for: ${items[i].url}`,
        PIN_CONTENT_MANAGER_ID
      )

      if (result.success && result.response?.status === 'success') {
        const data = result.response.result as PinContentResult
        setBulkPins(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'generated', data } : item))
      } else {
        setBulkPins(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error', error: result.error || 'Failed' } : item))
      }
    }

    setActiveAgentId(null)
    setBulkProcessing(false)
    setStatusMessage({ type: 'success', text: `Processed ${items.length} URLs` })
  }

  const handleScheduleToggle = async () => {
    if (!scheduleData) return
    setScheduleLoading(true)

    if (scheduleData.is_active) {
      const result = await pauseSchedule(scheduleData.id)
      if (result.success) {
        setStatusMessage({ type: 'success', text: 'Schedule paused' })
      } else {
        setStatusMessage({ type: 'error', text: result.error || 'Failed to pause schedule' })
      }
    } else {
      const result = await resumeSchedule(scheduleData.id)
      if (result.success) {
        setStatusMessage({ type: 'success', text: 'Schedule resumed' })
      } else {
        setStatusMessage({ type: 'error', text: result.error || 'Failed to resume schedule' })
      }
    }

    // Always refresh after toggle
    await loadScheduleData()
    setScheduleLoading(false)
  }

  const handleTriggerNow = async () => {
    if (!scheduleData) return
    setScheduleLoading(true)
    const result = await triggerScheduleNow(scheduleData.id)
    if (result.success) {
      setStatusMessage({ type: 'success', text: 'Schedule triggered successfully' })
      await loadScheduleData()
    } else {
      setStatusMessage({ type: 'error', text: result.error || 'Failed to trigger schedule' })
    }
    setScheduleLoading(false)
  }

  const handleAddHashtag = () => {
    if (newHashtag.trim()) {
      const tag = newHashtag.startsWith('#') ? newHashtag.trim() : `#${newHashtag.trim()}`
      setEditHashtags(prev => [...prev, tag])
      setNewHashtag('')
    }
  }

  const handleAddKeywordTag = () => {
    if (newKeywordTag.trim()) {
      setEditKeywordTags(prev => [...prev, newKeywordTag.trim()])
      setNewKeywordTag('')
    }
  }

  const handleCopyUrl = async (url: string) => {
    const ok = await copyToClipboard(url)
    if (ok) setStatusMessage({ type: 'success', text: 'URL copied to clipboard' })
  }

  // ---------------------------------------------------------------------------
  // Navigation items
  // ---------------------------------------------------------------------------

  const navItems = [
    { id: 'dashboard', label: 'DASHBOARD', icon: <FiHome size={18} /> },
    { id: 'create', label: 'CREATE PIN', icon: <FiPlus size={18} /> },
    { id: 'bulk', label: 'BULK MODE', icon: <FiLayers size={18} /> },
    { id: 'scheduled', label: 'SCHEDULED', icon: <FiCalendar size={18} /> },
    { id: 'analytics', label: 'ANALYTICS', icon: <FiBarChart2 size={18} /> },
    { id: 'settings', label: 'SETTINGS', icon: <FiSettings size={18} /> },
  ]

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Status Message */}
        {statusMessage && (
          <div className={cn('fixed top-4 right-4 z-50 p-4 border max-w-sm', statusMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : statusMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800')}>
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' && <FiCheck size={14} />}
              {statusMessage.type === 'error' && <FiAlertCircle size={14} />}
              {statusMessage.type === 'info' && <FiRefreshCw size={14} className="animate-spin" />}
              <p className="text-xs tracking-wider">{statusMessage.text}</p>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <aside className={cn('bg-card border-r border-border flex flex-col transition-all duration-300 shrink-0', sidebarOpen ? 'w-56' : 'w-16')}>
          <div className="p-4 flex items-center justify-between border-b border-border">
            {sidebarOpen && (
              <h1 className="font-serif text-lg tracking-widest font-medium text-primary">PinPost AI</h1>
            )}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-muted transition-colors">
              {sidebarOpen ? <FiChevronLeft size={16} /> : <FiMenu size={16} />}
            </button>
          </div>

          <nav className="flex-1 py-4">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className={cn('w-full flex items-center gap-3 px-4 py-3 text-xs tracking-widest transition-all duration-200', activeScreen === item.id ? 'bg-primary/10 text-primary border-r-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Agent Status */}
          {sidebarOpen && (
            <div className="p-4 border-t border-border space-y-2">
              <p className="text-[10px] tracking-widest text-muted-foreground uppercase">Agents</p>
              {AGENTS.map(agent => (
                <div key={agent.id} className="flex items-center gap-2">
                  <div className={cn('w-1.5 h-1.5', activeAgentId === agent.id ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30')} />
                  <span className="text-[10px] tracking-wider text-muted-foreground truncate">{agent.name}</span>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <ScrollArea className="h-screen">
            <div className="p-6 lg:p-8 max-w-7xl mx-auto">
              {/* Top Bar */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-serif tracking-widest font-medium">{navItems.find(n => n.id === activeScreen)?.label || 'DASHBOARD'}</h2>
                  {activeScreen === 'review' && <p className="text-xs tracking-widest text-muted-foreground mt-1">REVIEW & EDIT</p>}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sample-toggle" className="text-xs tracking-widest text-muted-foreground">SAMPLE DATA</Label>
                    <Switch id="sample-toggle" checked={showSampleData} onCheckedChange={setShowSampleData} />
                  </div>
                  {activeScreen !== 'create' && activeScreen !== 'review' && (
                    <Button onClick={() => setActiveScreen('create')} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs tracking-widest px-6">
                      <FiPlus size={14} className="mr-2" />CREATE PIN
                    </Button>
                  )}
                </div>
              </div>

              {/* ============================================================= */}
              {/* DASHBOARD SCREEN */}
              {/* ============================================================= */}
              {activeScreen === 'dashboard' && (
                <div className="space-y-8">
                  {/* Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Pins" value={showSampleData ? '47' : String(allPins.length)} trend={showSampleData ? '+12%' : undefined} icon={<FiGrid size={20} />} />
                    <StatCard label="Total Clicks" value={showSampleData ? '1,158' : '0'} trend={showSampleData ? '+8.3%' : undefined} icon={<FiExternalLink size={20} />} />
                    <StatCard label="Total Saves" value={showSampleData ? '748' : '0'} trend={showSampleData ? '+15.2%' : undefined} icon={<FiHeart size={20} />} />
                    <StatCard label="Impressions" value={showSampleData ? '22,550' : '0'} trend={showSampleData ? '+5.7%' : undefined} icon={<FiEye size={20} />} />
                  </div>

                  {/* Filter */}
                  <div className="flex items-center gap-3">
                    <FiFilter size={14} className="text-muted-foreground" />
                    <Select value={dashboardFilter} onValueChange={setDashboardFilter}>
                      <SelectTrigger className="w-40 text-xs tracking-widest">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ALL PINS</SelectItem>
                        <SelectItem value="published">PUBLISHED</SelectItem>
                        <SelectItem value="scheduled">SCHEDULED</SelectItem>
                        <SelectItem value="draft">DRAFTS</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground tracking-wider">{filteredPins.length} pins</span>
                  </div>

                  {/* Pins Grid */}
                  {filteredPins.length === 0 ? (
                    <Card className="border border-border bg-card">
                      <CardContent className="p-12 text-center">
                        <FiImage size={32} className="mx-auto mb-4 text-muted-foreground/40" />
                        <p className="text-sm tracking-widest text-muted-foreground mb-4">No pins yet - create your first pin</p>
                        <Button onClick={() => setActiveScreen('create')} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs tracking-widest px-6">
                          <FiPlus size={14} className="mr-2" />CREATE YOUR FIRST PIN
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredPins.map(pin => (
                        <Card key={pin.id} className="border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer group">
                          <CardContent className="p-0">
                            <div className="aspect-[3/2] bg-muted flex items-center justify-center relative">
                              {pin.image_url ? (
                                <img src={pin.image_url} alt={pin.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-center">
                                  <FiImage size={24} className="mx-auto text-muted-foreground/30" />
                                </div>
                              )}
                              <div className="absolute top-2 right-2">
                                <StatusBadge status={pin.status} />
                              </div>
                            </div>
                            <div className="p-4 space-y-2">
                              <p className="text-[10px] tracking-widest text-muted-foreground uppercase">{pin.brand || pin.category || 'Uncategorized'}</p>
                              <h3 className="text-sm font-medium tracking-wider line-clamp-1">{pin.title}</h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">{pin.description}</p>
                              <div className="flex items-center justify-between pt-2">
                                <span className="text-xs text-muted-foreground tracking-wider">{pin.board || 'No board'}</span>
                                {pin.pin_url && (
                                  <a href={pin.pin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                                    <FiExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================= */}
              {/* CREATE PIN SCREEN */}
              {/* ============================================================= */}
              {activeScreen === 'create' && (
                <div className="max-w-2xl mx-auto space-y-8">
                  <Card className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-base tracking-widest font-serif">PRODUCT URL</CardTitle>
                      <CardDescription className="text-xs tracking-wider">Enter a product URL to extract data and generate optimized Pinterest content</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <Textarea
                          placeholder="https://example.com/product/beautiful-vase"
                          value={productUrl}
                          onChange={(e) => setProductUrl(e.target.value)}
                          className="min-h-[100px] text-sm tracking-wider bg-background border-border"
                        />
                        <p className="text-[10px] tracking-widest text-muted-foreground mt-2">Enter one product URL. For multiple URLs, use Bulk Mode.</p>
                      </div>

                      {/* Affiliate Settings */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-xs tracking-widest">AFFILIATE LINK</Label>
                            <p className="text-[10px] tracking-wider text-muted-foreground mt-0.5">Auto-insert affiliate parameters</p>
                          </div>
                          <Switch checked={affiliateEnabled} onCheckedChange={setAffiliateEnabled} />
                        </div>
                        {affiliateEnabled && (
                          <Input
                            placeholder="Affiliate ID (e.g., partner-123)"
                            value={affiliateId}
                            onChange={(e) => setAffiliateId(e.target.value)}
                            className="text-sm tracking-wider bg-background border-border"
                          />
                        )}
                      </div>

                      <Separator />

                      {/* UTM Configuration */}
                      <Collapsible open={utmOpen} onOpenChange={setUtmOpen}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-1">
                          <Label className="text-xs tracking-widest cursor-pointer">UTM PARAMETERS</Label>
                          {utmOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 pt-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-[10px] tracking-widest text-muted-foreground">SOURCE</Label>
                              <Input
                                placeholder="pinterest"
                                value={utmSource}
                                onChange={(e) => setUtmSource(e.target.value)}
                                className="text-sm tracking-wider bg-background border-border mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] tracking-widest text-muted-foreground">MEDIUM</Label>
                              <Input
                                placeholder="social"
                                value={utmMedium}
                                onChange={(e) => setUtmMedium(e.target.value)}
                                className="text-sm tracking-wider bg-background border-border mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] tracking-widest text-muted-foreground">CAMPAIGN</Label>
                              <Input
                                placeholder="pinpost"
                                value={utmCampaign}
                                onChange={(e) => setUtmCampaign(e.target.value)}
                                className="text-sm tracking-wider bg-background border-border mt-1"
                              />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <Separator />

                      <Button
                        onClick={handleGeneratePin}
                        disabled={generatingPin || !productUrl.trim()}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs tracking-widest py-6"
                      >
                        {generatingPin ? (
                          <><FiRefreshCw size={14} className="mr-2 animate-spin" />GENERATING...</>
                        ) : (
                          <><FiZap size={14} className="mr-2" />GENERATE PIN CONTENT</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Loading skeleton */}
                  {generatingPin && (
                    <Card className="border border-border bg-card">
                      <CardContent className="p-6 space-y-4">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-20 w-full" />
                        <div className="grid grid-cols-3 gap-3">
                          <Skeleton className="h-8 w-full" />
                          <Skeleton className="h-8 w-full" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* ============================================================= */}
              {/* PIN REVIEW & EDIT SCREEN */}
              {/* ============================================================= */}
              {activeScreen === 'review' && (
                <div className="space-y-6">
                  {!pinData && !showSampleData ? (
                    <Card className="border border-border bg-card">
                      <CardContent className="p-12 text-center">
                        <FiImage size={32} className="mx-auto mb-4 text-muted-foreground/40" />
                        <p className="text-sm tracking-widest text-muted-foreground mb-4">No pin data to review. Generate a pin first.</p>
                        <Button onClick={() => setActiveScreen('create')} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs tracking-widest">
                          <FiPlus size={14} className="mr-2" />CREATE PIN
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                      {/* LEFT: Pin Preview */}
                      <div className="lg:col-span-2 space-y-6">
                        <div className="sticky top-6">
                          <p className="text-[10px] tracking-widest text-muted-foreground uppercase mb-3">LIVE PREVIEW</p>
                          <PinPreviewCard
                            title={editTitle}
                            description={editDescription}
                            imageUrl={generatedImageUrl || (Array.isArray(pinData?.image_urls) && (pinData?.image_urls?.length ?? 0) > 0 ? pinData?.image_urls?.[selectedImageIndex] : undefined)}
                            brand={pinData?.brand}
                          />
                          {/* Product Info */}
                          {pinData && (
                            <div className="mt-4 space-y-2 p-4 border border-border bg-card">
                              <p className="text-[10px] tracking-widest text-muted-foreground uppercase">PRODUCT INFO</p>
                              <p className="text-sm font-medium tracking-wider">{pinData?.product_title ?? ''}</p>
                              {pinData?.brand && <p className="text-xs text-muted-foreground tracking-wider">by {pinData.brand}</p>}
                              <div className="flex items-center gap-2">
                                {pinData?.sale_price && (
                                  <>
                                    <span className="text-sm font-medium text-primary tracking-wider">{pinData.sale_price}</span>
                                    <span className="text-xs text-muted-foreground line-through tracking-wider">{pinData?.price ?? ''}</span>
                                  </>
                                )}
                                {!pinData?.sale_price && pinData?.price && (
                                  <span className="text-sm font-medium tracking-wider">{pinData.price}</span>
                                )}
                              </div>
                              {pinData?.category && (
                                <Badge variant="outline" className="text-[10px] tracking-widest">{pinData.category}</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* RIGHT: Editable Fields */}
                      <div className="lg:col-span-3 space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs tracking-widest">PINTEREST TITLE</Label>
                            <span className={cn('text-[10px] tracking-wider', (editTitle?.length ?? 0) > 100 ? 'text-red-500' : 'text-muted-foreground')}>{editTitle?.length ?? 0}/100</span>
                          </div>
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            maxLength={100}
                            className="text-sm tracking-wider bg-background border-border"
                            placeholder="Enter pin title..."
                          />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs tracking-widest">DESCRIPTION</Label>
                            <span className={cn('text-[10px] tracking-wider', (editDescription?.length ?? 0) > 500 ? 'text-red-500' : 'text-muted-foreground')}>{editDescription?.length ?? 0}/500</span>
                          </div>
                          <Textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            maxLength={500}
                            rows={4}
                            className="text-sm tracking-wider bg-background border-border"
                            placeholder="Enter pin description..."
                          />
                        </div>

                        {/* SEO Score */}
                        {pinData?.seo_score && (
                          <Card className="border border-border bg-card">
                            <CardContent className="p-4">
                              <SeoScoreDisplay score={pinData.seo_score} />
                            </CardContent>
                          </Card>
                        )}

                        {/* Hashtags */}
                        <div className="space-y-2">
                          <Label className="text-xs tracking-widest">HASHTAGS</Label>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(editHashtags) && editHashtags.map((tag, i) => (
                              <TagChip key={i} label={tag} onRemove={() => setEditHashtags(prev => prev.filter((_, idx) => idx !== i))} />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add hashtag..."
                              value={newHashtag}
                              onChange={(e) => setNewHashtag(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHashtag())}
                              className="text-sm tracking-wider bg-background border-border flex-1"
                            />
                            <Button onClick={handleAddHashtag} variant="outline" size="sm" className="text-xs tracking-widest">
                              <FiPlus size={12} />
                            </Button>
                          </div>
                        </div>

                        {/* Keyword Tags */}
                        <div className="space-y-2">
                          <Label className="text-xs tracking-widest">KEYWORD TAGS</Label>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(editKeywordTags) && editKeywordTags.map((tag, i) => (
                              <TagChip key={i} label={tag} onRemove={() => setEditKeywordTags(prev => prev.filter((_, idx) => idx !== i))} />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add keyword tag..."
                              value={newKeywordTag}
                              onChange={(e) => setNewKeywordTag(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeywordTag())}
                              className="text-sm tracking-wider bg-background border-border flex-1"
                            />
                            <Button onClick={handleAddKeywordTag} variant="outline" size="sm" className="text-xs tracking-widest">
                              <FiPlus size={12} />
                            </Button>
                          </div>
                        </div>

                        {/* Product Features */}
                        {Array.isArray(pinData?.features) && (pinData?.features?.length ?? 0) > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs tracking-widest">PRODUCT FEATURES</Label>
                            <ul className="space-y-1">
                              {pinData?.features?.map((f, i) => (
                                <li key={i} className="text-xs text-muted-foreground tracking-wider flex items-start gap-2">
                                  <FiCheck size={12} className="mt-0.5 text-primary shrink-0" />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <Separator />

                        {/* Images Section */}
                        <div className="space-y-3">
                          <Label className="text-xs tracking-widest">IMAGES</Label>

                          {/* Product images carousel */}
                          {Array.isArray(pinData?.image_urls) && (pinData?.image_urls?.length ?? 0) > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] tracking-widest text-muted-foreground">PRODUCT IMAGES</p>
                              <div className="flex gap-2 overflow-x-auto pb-2">
                                {pinData?.image_urls?.map((url, i) => (
                                  <button
                                    key={i}
                                    onClick={() => { setSelectedImageIndex(i); setGeneratedImageUrl(null) }}
                                    className={cn('w-16 h-16 border flex-shrink-0 overflow-hidden', selectedImageIndex === i && !generatedImageUrl ? 'border-primary border-2' : 'border-border')}
                                  >
                                    <img src={url} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Generated image */}
                          {generatedImageUrl && (
                            <div className="space-y-2">
                              <p className="text-[10px] tracking-widest text-muted-foreground">AI GENERATED IMAGE</p>
                              <div className="border border-primary/30 overflow-hidden max-w-xs">
                                <img src={generatedImageUrl} alt="Generated pin" className="w-full h-auto" />
                              </div>
                            </div>
                          )}

                          <Button
                            onClick={handleGenerateImage}
                            disabled={generatingImage}
                            variant="outline"
                            className="text-xs tracking-widest w-full"
                          >
                            {generatingImage ? (
                              <><FiRefreshCw size={14} className="mr-2 animate-spin" />GENERATING IMAGE...</>
                            ) : (
                              <><FiImage size={14} className="mr-2" />GENERATE AI IMAGE</>
                            )}
                          </Button>
                        </div>

                        <Separator />

                        {/* Board Selector */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs tracking-widest">PINTEREST BOARD</Label>
                            <Button
                              onClick={handleFetchBoards}
                              disabled={fetchingBoards}
                              variant="ghost"
                              size="sm"
                              className="text-[10px] tracking-widest text-primary h-auto py-1 px-2"
                            >
                              {fetchingBoards ? (
                                <><FiRefreshCw size={10} className="mr-1 animate-spin" />FETCHING...</>
                              ) : (
                                <><FiRefreshCw size={10} className="mr-1" />{boardsFetched ? 'REFRESH BOARDS' : 'FETCH MY BOARDS'}</>
                              )}
                            </Button>
                          </div>
                          {!boardsFetched && (
                            <div className="p-3 bg-muted border border-border">
                              <p className="text-[10px] tracking-widest text-muted-foreground">Click "FETCH MY BOARDS" to load boards from your connected Pinterest account. The publisher agent will use the Pinterest API to list your boards.</p>
                            </div>
                          )}
                          <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                            <SelectTrigger className="text-sm tracking-wider bg-background border-border">
                              <SelectValue placeholder={boardsFetched ? 'Select your Pinterest board...' : 'Fetch boards first or type a board name...'} />
                            </SelectTrigger>
                            <SelectContent>
                              {(boardsFetched && pinterestBoards.length > 0 ? pinterestBoards : MOCK_BOARDS).map(board => (
                                <SelectItem key={board} value={board} className="text-sm tracking-wider">{board}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Link Preview */}
                        <div className="space-y-2">
                          <Label className="text-xs tracking-widest">PRODUCT DESTINATION LINK</Label>
                          <div className="flex items-center gap-2 p-3 bg-muted border border-border">
                            <FiLink size={12} className="text-primary shrink-0" />
                            <span className="text-xs tracking-wider text-foreground truncate flex-1">{pinData?.formatted_url || productUrl || 'No URL set'}</span>
                            <button onClick={() => handleCopyUrl(pinData?.formatted_url || productUrl)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                              <FiCopy size={12} />
                            </button>
                          </div>
                          <p className="text-[10px] tracking-widest text-muted-foreground">This link will be attached to the pin. When users click your pin on Pinterest, they will be directed to this product page.</p>
                        </div>

                        <Separator />

                        {/* Publish Summary */}
                        <div className="p-4 bg-secondary border border-border space-y-2">
                          <p className="text-[10px] tracking-widest uppercase text-muted-foreground">PUBLISH SUMMARY</p>
                          <div className="grid grid-cols-2 gap-2 text-xs tracking-wider">
                            <span className="text-muted-foreground">Board:</span>
                            <span>{selectedBoard || 'Auto-select first board'}</span>
                            <span className="text-muted-foreground">Image:</span>
                            <span>{generatedImageUrl ? 'AI Generated' : (Array.isArray(pinData?.image_urls) && (pinData?.image_urls?.length ?? 0) > 0 ? 'Product Image' : 'No image')}</span>
                            <span className="text-muted-foreground">Destination:</span>
                            <span className="truncate">{pinData?.formatted_url || productUrl || 'None'}</span>
                            <span className="text-muted-foreground">Hashtags:</span>
                            <span>{Array.isArray(editHashtags) ? editHashtags.length : 0} tags</span>
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex gap-3 pt-2">
                          <Button
                            onClick={handlePublishPin}
                            disabled={publishing || !editTitle}
                            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs tracking-widest py-5"
                          >
                            {publishing ? (
                              <><FiRefreshCw size={14} className="mr-2 animate-spin" />PUBLISHING TO PINTEREST...</>
                            ) : (
                              <><FiSend size={14} className="mr-2" />PUBLISH TO PINTEREST</>
                            )}
                          </Button>
                          <Button
                            onClick={handleSaveDraft}
                            disabled={!editTitle}
                            variant="outline"
                            className="text-xs tracking-widest py-5"
                          >
                            <FiDownload size={14} className="mr-2" />SAVE DRAFT
                          </Button>
                        </div>
                        {publishing && (
                          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800">
                            <p className="text-[10px] tracking-widest">The Pinterest Publisher Agent is connecting to your Pinterest account, fetching boards, and creating the pin with your product link attached. This may take a moment...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================= */}
              {/* BULK MODE SCREEN */}
              {/* ============================================================= */}
              {activeScreen === 'bulk' && (
                <div className="space-y-8">
                  <Card className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-base tracking-widest font-serif">BULK URL INPUT</CardTitle>
                      <CardDescription className="text-xs tracking-wider">Enter multiple product URLs, one per line</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        placeholder={"https://example.com/product-1\nhttps://example.com/product-2\nhttps://example.com/product-3"}
                        value={bulkUrls}
                        onChange={(e) => setBulkUrls(e.target.value)}
                        rows={6}
                        className="text-sm tracking-wider bg-background border-border font-mono"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground tracking-wider">
                          {bulkUrls.split('\n').filter(u => u.trim()).length} URLs
                        </span>
                        <Button
                          onClick={handleBulkGenerate}
                          disabled={bulkProcessing || !bulkUrls.trim()}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs tracking-widest"
                        >
                          {bulkProcessing ? (
                            <><FiRefreshCw size={14} className="mr-2 animate-spin" />PROCESSING...</>
                          ) : (
                            <><FiZap size={14} className="mr-2" />GENERATE ALL</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bulk Progress Table */}
                  {bulkPins.length > 0 && (
                    <Card className="border border-border bg-card">
                      <CardHeader>
                        <CardTitle className="text-base tracking-widest font-serif">PROGRESS</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[10px] tracking-widest">#</TableHead>
                              <TableHead className="text-[10px] tracking-widest">URL</TableHead>
                              <TableHead className="text-[10px] tracking-widest">STATUS</TableHead>
                              <TableHead className="text-[10px] tracking-widest">ACTIONS</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bulkPins.map((item, i) => (
                              <React.Fragment key={i}>
                                <TableRow className="hover:bg-muted/50">
                                  <TableCell className="text-xs tracking-wider">{i + 1}</TableCell>
                                  <TableCell className="text-xs tracking-wider truncate max-w-xs">{item.url}</TableCell>
                                  <TableCell><StatusBadge status={item.status} /></TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {item.data && (
                                        <button onClick={() => setExpandedBulkRow(expandedBulkRow === i ? null : i)} className="text-muted-foreground hover:text-foreground transition-colors">
                                          {expandedBulkRow === i ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                                        </button>
                                      )}
                                      {item.data && (
                                        <button
                                          onClick={() => {
                                            setPinData(item.data || null)
                                            setEditTitle(item.data?.pinterest_title || '')
                                            setEditDescription(item.data?.pinterest_description || '')
                                            setEditHashtags(Array.isArray(item.data?.hashtags) ? item.data.hashtags : [])
                                            setEditKeywordTags(Array.isArray(item.data?.keyword_tags) ? item.data.keyword_tags : [])
                                            setGeneratedImageUrl(null)
                                            setActiveScreen('review')
                                          }}
                                          className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                          <FiEdit2 size={14} />
                                        </button>
                                      )}
                                      {item.status === 'extracting' && <FiRefreshCw size={14} className="animate-spin text-muted-foreground" />}
                                    </div>
                                  </TableCell>
                                </TableRow>
                                {expandedBulkRow === i && item.data && (
                                  <TableRow>
                                    <TableCell colSpan={4}>
                                      <div className="p-4 bg-muted space-y-2">
                                        <p className="text-xs tracking-wider"><strong className="font-medium">Title:</strong> {item.data?.pinterest_title ?? '-'}</p>
                                        <p className="text-xs tracking-wider"><strong className="font-medium">Product:</strong> {item.data?.product_title ?? '-'}</p>
                                        <p className="text-xs tracking-wider"><strong className="font-medium">Brand:</strong> {item.data?.brand ?? '-'}</p>
                                        <p className="text-xs tracking-wider"><strong className="font-medium">Price:</strong> {item.data?.price ?? '-'}{item.data?.sale_price ? ` (Sale: ${item.data.sale_price})` : ''}</p>
                                        <p className="text-xs tracking-wider"><strong className="font-medium">Category:</strong> {item.data?.category ?? '-'}</p>
                                        <p className="text-xs tracking-wider"><strong className="font-medium">SEO Score:</strong> {item.data?.seo_score ?? '-'}</p>
                                        <div className="flex flex-wrap gap-1">
                                          {Array.isArray(item.data?.hashtags) && item.data.hashtags.map((tag, j) => (
                                            <TagChip key={j} label={tag} />
                                          ))}
                                        </div>
                                        {item.data?.pinterest_description && (
                                          <div className="text-xs tracking-wider text-muted-foreground mt-2">
                                            {renderMarkdown(item.data.pinterest_description)}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* ============================================================= */}
              {/* ANALYTICS SCREEN */}
              {/* ============================================================= */}
              {activeScreen === 'analytics' && (
                <div className="space-y-8">
                  {/* Date Range */}
                  <div className="flex items-center gap-2">
                    {['7d', '30d', '90d'].map(range => (
                      <Button
                        key={range}
                        variant={analyticsRange === range ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAnalyticsRange(range)}
                        className={cn('text-xs tracking-widest', analyticsRange === range ? 'bg-primary text-primary-foreground' : '')}
                      >
                        {range.toUpperCase()}
                      </Button>
                    ))}
                  </div>

                  {/* Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Clicks" value={showSampleData ? '1,158' : '0'} trend={showSampleData ? '+8.3%' : undefined} icon={<FiExternalLink size={20} />} />
                    <StatCard label="Saves" value={showSampleData ? '748' : '0'} trend={showSampleData ? '+15.2%' : undefined} icon={<FiHeart size={20} />} />
                    <StatCard label="Impressions" value={showSampleData ? '22,550' : '0'} trend={showSampleData ? '+5.7%' : undefined} icon={<FiEye size={20} />} />
                    <StatCard label="CTR" value={showSampleData ? '5.1%' : '0%'} trend={showSampleData ? '+0.3%' : undefined} icon={<FiTrendingUp size={20} />} />
                  </div>

                  {/* Charts */}
                  {showSampleData ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Line Chart */}
                      <Card className="border border-border bg-card">
                        <CardHeader>
                          <CardTitle className="text-sm tracking-widest font-serif">ENGAGEMENT TRENDS</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ChartContainer config={CHART_CONFIG} className="h-64 w-full">
                            <LineChart data={MOCK_ANALYTICS_DATA}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(30 10% 88%)" />
                              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(30 5% 50%)" />
                              <YAxis tick={{ fontSize: 10 }} stroke="hsl(30 5% 50%)" />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Line type="monotone" dataKey="clicks" stroke="hsl(40 30% 45%)" strokeWidth={2} dot={{ r: 3 }} />
                              <Line type="monotone" dataKey="saves" stroke="hsl(30 20% 35%)" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          </ChartContainer>
                        </CardContent>
                      </Card>

                      {/* Bar Chart */}
                      <Card className="border border-border bg-card">
                        <CardHeader>
                          <CardTitle className="text-sm tracking-widest font-serif">IMPRESSIONS</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ChartContainer config={CHART_CONFIG} className="h-64 w-full">
                            <BarChart data={MOCK_ANALYTICS_DATA}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(30 10% 88%)" />
                              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(30 5% 50%)" />
                              <YAxis tick={{ fontSize: 10 }} stroke="hsl(30 5% 50%)" />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="impressions" fill="hsl(40 30% 45%)" />
                            </BarChart>
                          </ChartContainer>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card className="border border-border bg-card">
                      <CardContent className="p-12 text-center">
                        <FiBarChart2 size={32} className="mx-auto mb-4 text-muted-foreground/40" />
                        <p className="text-sm tracking-widest text-muted-foreground mb-2">No analytics data yet</p>
                        <p className="text-xs tracking-wider text-muted-foreground">Toggle sample data to preview analytics or publish your first pin.</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Top Pins Table */}
                  {showSampleData && (
                    <Card className="border border-border bg-card">
                      <CardHeader>
                        <CardTitle className="text-sm tracking-widest font-serif">TOP PERFORMING PINS</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[10px] tracking-widest">PIN</TableHead>
                              <TableHead className="text-[10px] tracking-widest">CLICKS</TableHead>
                              <TableHead className="text-[10px] tracking-widest">SAVES</TableHead>
                              <TableHead className="text-[10px] tracking-widest">IMPRESSIONS</TableHead>
                              <TableHead className="text-[10px] tracking-widest">CTR</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {MOCK_RECENT_PINS.filter(p => p.status === 'published').map(pin => (
                              <TableRow key={pin.id}>
                                <TableCell className="text-xs tracking-wider">{pin.title}</TableCell>
                                <TableCell className="text-xs tracking-wider">245</TableCell>
                                <TableCell className="text-xs tracking-wider">156</TableCell>
                                <TableCell className="text-xs tracking-wider">4,820</TableCell>
                                <TableCell className="text-xs tracking-wider">5.1%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* ============================================================= */}
              {/* SCHEDULED PINS SCREEN */}
              {/* ============================================================= */}
              {activeScreen === 'scheduled' && (
                <div className="space-y-8">
                  {/* Schedule Management */}
                  <Card className="border border-border bg-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base tracking-widest font-serif">PUBLISHER SCHEDULE</CardTitle>
                          <CardDescription className="text-xs tracking-wider mt-1">Pinterest Publisher Agent automatic scheduling</CardDescription>
                        </div>
                        {scheduleData && (
                          <StatusBadge status={scheduleData.is_active ? 'active' : 'paused'} />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {scheduleLoading && !scheduleData ? (
                        <div className="space-y-3">
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : scheduleData ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-muted border border-border">
                              <p className="text-[10px] tracking-widest text-muted-foreground uppercase mb-1">FREQUENCY</p>
                              <p className="text-sm tracking-wider">{cronToHuman(scheduleData.cron_expression)}</p>
                              <p className="text-[10px] tracking-wider text-muted-foreground mt-1">{scheduleData.cron_expression}</p>
                            </div>
                            <div className="p-4 bg-muted border border-border">
                              <p className="text-[10px] tracking-widest text-muted-foreground uppercase mb-1">TIMEZONE</p>
                              <p className="text-sm tracking-wider">{scheduleData.timezone || 'UTC'}</p>
                            </div>
                            <div className="p-4 bg-muted border border-border">
                              <p className="text-[10px] tracking-widest text-muted-foreground uppercase mb-1">NEXT RUN</p>
                              <p className="text-sm tracking-wider">{scheduleData.next_run_time ? new Date(scheduleData.next_run_time).toLocaleString() : 'Not scheduled'}</p>
                            </div>
                          </div>

                          {scheduleData.last_run_at && (
                            <div className="flex items-center gap-2 text-xs tracking-wider text-muted-foreground">
                              <FiClock size={12} />
                              <span>Last run: {new Date(scheduleData.last_run_at).toLocaleString()}</span>
                              {scheduleData.last_run_success !== null && (
                                <StatusBadge status={scheduleData.last_run_success ? 'published' : 'error'} />
                              )}
                            </div>
                          )}

                          <div className="flex gap-3">
                            <Button
                              onClick={handleScheduleToggle}
                              disabled={scheduleLoading}
                              variant={scheduleData.is_active ? 'outline' : 'default'}
                              className={cn('text-xs tracking-widest', !scheduleData.is_active ? 'bg-primary text-primary-foreground' : '')}
                            >
                              {scheduleLoading ? (
                                <FiRefreshCw size={14} className="mr-2 animate-spin" />
                              ) : scheduleData.is_active ? (
                                <FiPause size={14} className="mr-2" />
                              ) : (
                                <FiPlay size={14} className="mr-2" />
                              )}
                              {scheduleData.is_active ? 'PAUSE SCHEDULE' : 'RESUME SCHEDULE'}
                            </Button>
                            <Button
                              onClick={handleTriggerNow}
                              disabled={scheduleLoading}
                              variant="outline"
                              className="text-xs tracking-widest"
                            >
                              <FiZap size={14} className="mr-2" />TRIGGER NOW
                            </Button>
                            <Button
                              onClick={loadScheduleData}
                              disabled={scheduleLoading}
                              variant="outline"
                              size="sm"
                              className="text-xs tracking-widest"
                            >
                              <FiRefreshCw size={14} className={scheduleLoading ? 'animate-spin' : ''} />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-6">
                          <FiCalendar size={24} className="mx-auto mb-3 text-muted-foreground/40" />
                          <p className="text-sm tracking-widest text-muted-foreground">Unable to load schedule data</p>
                          <Button onClick={loadScheduleData} variant="outline" size="sm" className="text-xs tracking-widest mt-3">
                            <FiRefreshCw size={14} className="mr-2" />RETRY
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Execution Logs */}
                  <Card className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-base tracking-widest font-serif">EXECUTION HISTORY</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {scheduleLogs.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-[10px] tracking-widest">EXECUTED AT</TableHead>
                              <TableHead className="text-[10px] tracking-widest">STATUS</TableHead>
                              <TableHead className="text-[10px] tracking-widest">ATTEMPT</TableHead>
                              <TableHead className="text-[10px] tracking-widest">RESPONSE</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {scheduleLogs.map(log => (
                              <TableRow key={log.id}>
                                <TableCell className="text-xs tracking-wider">{new Date(log.executed_at).toLocaleString()}</TableCell>
                                <TableCell><StatusBadge status={log.success ? 'published' : 'error'} /></TableCell>
                                <TableCell className="text-xs tracking-wider">{log.attempt}/{log.max_attempts}</TableCell>
                                <TableCell className="text-xs tracking-wider max-w-xs truncate">{log.error_message || `Status ${log.response_status}`}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center p-6">
                          <FiClock size={24} className="mx-auto mb-3 text-muted-foreground/40" />
                          <p className="text-sm tracking-widest text-muted-foreground">No execution logs yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Scheduled Pins List */}
                  <Card className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-base tracking-widest font-serif">SCHEDULED PINS</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {showSampleData ? (
                        <div className="space-y-3">
                          {MOCK_RECENT_PINS.filter(p => p.status === 'scheduled').map(pin => (
                            <div key={pin.id} className="flex items-center justify-between p-4 border border-border hover:border-primary/20 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-muted flex items-center justify-center">
                                  <FiImage size={16} className="text-muted-foreground/40" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium tracking-wider">{pin.title}</p>
                                  <p className="text-xs text-muted-foreground tracking-wider">{pin.board} &middot; {new Date(pin.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <StatusBadge status="scheduled" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-6">
                          <FiCalendar size={24} className="mx-auto mb-3 text-muted-foreground/40" />
                          <p className="text-sm tracking-widest text-muted-foreground">No scheduled pins. Toggle sample data to preview.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ============================================================= */}
              {/* SETTINGS SCREEN */}
              {/* ============================================================= */}
              {activeScreen === 'settings' && (
                <div className="max-w-2xl mx-auto space-y-8">
                  {/* Account Info */}
                  <Card className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-base tracking-widest font-serif">PINTEREST ACCOUNT</CardTitle>
                      <CardDescription className="text-xs tracking-wider">Connected via Composio Pinterest integration in Lyzr Studio</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 flex items-center justify-center">
                          <FiStar size={20} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium tracking-wider">Pinterest API Connected</p>
                          <p className="text-xs text-muted-foreground tracking-wider">OAuth authenticated &middot; PINTEREST_LIST_BOARDS &middot; PINTEREST_CREATE_PIN</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] tracking-widest ml-auto">ACTIVE</Badge>
                      </div>
                      <div className="p-3 bg-muted border border-border">
                        <p className="text-[10px] tracking-widest text-muted-foreground">The Pinterest Publisher Agent uses Composio&apos;s Pinterest integration to automatically create pins on your boards. Pins include your product link as the destination URL so clicks drive traffic to your product page. Authentication is managed through Lyzr Studio.</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Default Affiliate */}
                  <Card className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-base tracking-widest font-serif">DEFAULT AFFILIATE SETTINGS</CardTitle>
                      <CardDescription className="text-xs tracking-wider">These defaults will be pre-filled when creating new pins</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-xs tracking-widest">DEFAULT AFFILIATE ID</Label>
                        <Input
                          placeholder="partner-123"
                          value={defaultAffiliateId}
                          onChange={(e) => setDefaultAffiliateId(e.target.value)}
                          className="text-sm tracking-wider bg-background border-border mt-1"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Default UTM */}
                  <Card className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-base tracking-widest font-serif">DEFAULT UTM PARAMETERS</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-[10px] tracking-widest text-muted-foreground">SOURCE</Label>
                          <Input
                            value={defaultUtmSource}
                            onChange={(e) => setDefaultUtmSource(e.target.value)}
                            className="text-sm tracking-wider bg-background border-border mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] tracking-widest text-muted-foreground">MEDIUM</Label>
                          <Input
                            value={defaultUtmMedium}
                            onChange={(e) => setDefaultUtmMedium(e.target.value)}
                            className="text-sm tracking-wider bg-background border-border mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] tracking-widest text-muted-foreground">CAMPAIGN</Label>
                          <Input
                            value={defaultUtmCampaign}
                            onChange={(e) => setDefaultUtmCampaign(e.target.value)}
                            className="text-sm tracking-wider bg-background border-border mt-1"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notifications */}
                  <Card className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-base tracking-widest font-serif">NOTIFICATIONS</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs tracking-widest">PUBLISH NOTIFICATIONS</Label>
                          <p className="text-[10px] tracking-wider text-muted-foreground mt-0.5">Get notified when a pin is published</p>
                        </div>
                        <Switch checked={notifyOnPublish} onCheckedChange={setNotifyOnPublish} />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs tracking-widest">SCHEDULE NOTIFICATIONS</Label>
                          <p className="text-[10px] tracking-wider text-muted-foreground mt-0.5">Get notified on scheduled pin activity</p>
                        </div>
                        <Switch checked={notifyOnSchedule} onCheckedChange={setNotifyOnSchedule} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Agent Info */}
                  <Card className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-base tracking-widest font-serif">AI AGENTS</CardTitle>
                      <CardDescription className="text-xs tracking-wider">The AI agents powering PinPost</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {AGENTS.map(agent => (
                          <div key={agent.id} className="flex items-center gap-3 p-3 border border-border">
                            <div className={cn('w-2 h-2', activeAgentId === agent.id ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30')} />
                            <div className="flex-1">
                              <p className="text-xs font-medium tracking-wider">{agent.name}</p>
                              <p className="text-[10px] text-muted-foreground tracking-wider">{agent.purpose}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground tracking-wider font-mono">{agent.id.slice(0, 8)}...</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

            </div>
          </ScrollArea>
        </main>
      </div>
    </ErrorBoundary>
  )
}
