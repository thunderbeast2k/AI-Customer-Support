import { useState, useEffect, useRef } from 'react'
import {
  Upload,
  FileText,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Ticket,
  Loader2,
  ChevronDown,
  X,
  Settings,
  Zap,
  Shield,
  Users,
  Bot,
  User,
  Copy,
  Check,
  Clock,
  AlertCircle
} from 'lucide-react'

const API_BASE = '/api'

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [tickets, setTickets] = useState([])
  const [isRefreshingTickets, setIsRefreshingTickets] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)

  const fetchTickets = async () => {
    setIsRefreshingTickets(true)
    try {
      const res = await fetch(`${API_BASE}/admin/tickets`)
      if (res.ok) {
        const data = await res.json()
        setTickets(data)
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    } finally {
      setIsRefreshingTickets(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { sender: 'user', text: input, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    const currentInput = input
    setInput('')

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: currentInput })
      })
      const data = await res.json()

      if (data.escalated && data.ticket) {
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: data.reply,
          timestamp: new Date().toISOString(),
          escalated: true,
          ticket: data.ticket,
          sources: data.sources
        }])
        fetchTickets()
      } else {
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: data.reply,
          timestamp: new Date().toISOString(),
          sources: data.sources
        }])
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.txt')) {
      alert('Only .pdf and .txt files are supported')
      return
    }

    setIsUploading(true)
    setUploadStatus('Uploading and indexing...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_BASE}/admin/upload-kb`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (res.ok) {
        setUploadStatus(`Indexed ${data.filename} (${data.chunks_indexed} chunks)`)
      } else {
        setUploadStatus(`Error: ${data.detail || 'Upload failed'}`)
      }
    } catch (err) {
      console.error('Upload error:', err)
      setUploadStatus('Upload failed. Check console for details.')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const handleResolve = async (ticketId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/tickets/${ticketId}/resolve`, {
        method: 'PATCH'
      })
      if (res.ok) {
        fetchTickets()
      }
    } catch (err) {
      console.error('Resolve error:', err)
    }
  }

  const priorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'Medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const sentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'Frustrated': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'Urgent': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      default: return 'bg-green-500/20 text-green-400 border-green-500/30'
    }
  }

  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">IntelliDesk AI</h1>
            <p className="text-xs text-slate-400">RAG Self-Service & Automated Ticket Triage Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="file" accept=".pdf,.txt" onChange={handleUpload} className="sr-only" disabled={isUploading} />
            <Upload className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors hidden sm:block">
              Upload Knowledge Base
            </span>
          </label>
          {uploadStatus && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 animate-fade-in">
              {uploadStatus}
            </div>
          )}
        </div>
      </nav>

      {/* Split Screen Panels */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Live Chat */}
        <section className="w-full lg:w-1/2 border-r border-slate-800 flex flex-col min-w-0">
          <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <h2 className="font-semibold text-white">Live Customer Support Chat</h2>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Session: {sessionId.slice(-8)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Zap className="w-3.5 h-3.5" />
              <span>Powered by RAG + Gemini</span>
            </div>
          </div>

          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Bot className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg">Welcome to IntelliDesk AI</p>
                <p className="text-sm mt-1">Ask a question about our policies, products, or services</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center text-xs">
                  <span className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg">"What is your return policy?"</span>
                  <span className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg">"How long is the hardware warranty?"</span>
                  <span className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg">"When will I get my refund?"</span>
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                <div className={`max-w-[80%] ${msg.sender === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {msg.sender === 'bot' && <Bot className="w-4 h-4 text-blue-400" />}
                    {msg.sender === 'user' && <User className="w-4 h-4 text-purple-400" />}
                    <span className="text-xs text-slate-400 font-medium">
                      {msg.sender === 'user' ? 'You' : 'IntelliDesk AI'}
                    </span>
                    <span className="text-xs text-slate-500">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className={`
                    rounded-2xl px-4 py-3 ${msg.sender === 'user'
                      ? 'bg-blue-500/20 text-white border border-blue-500/30 rounded-br-none'
                      : msg.escalated
                        ? 'bg-amber-500/10 text-amber-100 border border-amber-500/30 rounded-bl-none'
                        : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.escalated && msg.ticket && (
                      <div className="mt-3 pt-3 border-t border-amber-500/30">
                        <div className="flex items-center gap-2 text-xs text-amber-300 mb-2">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="font-medium">Escalated to Human Agent</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-800/50 rounded-lg p-2">
                            <div className="text-slate-400">Ticket ID</div>
                            <div className="font-mono text-white">#{msg.ticket.id}</div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-2">
                            <div className="text-slate-400">Priority</div>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${priorityColor(msg.ticket.priority).replace('border-', '')}`}>
                              {msg.ticket.priority}
                            </span>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-2">
                            <div className="text-slate-400">Category</div>
                            <div className="text-white capitalize">{msg.ticket.category.toLowerCase()}</div>
                          </div>
                          <div className="bg-slate-800/50 rounded-lg p-2">
                            <div className="text-slate-400">Sentiment</div>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${sentimentColor(msg.ticket.sentiment).replace('border-', '')}`}>
                              {msg.ticket.sentiment}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {msg.sources && msg.sources.length > 0 && !msg.escalated && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Sources:
                        </span>
                        {msg.sources.map((src, si) => (
                          <span key={si} className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-600">
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {isLoading && (
            <div className="px-4 py-3 flex items-center gap-2 text-slate-400 animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span>AI is thinking...</span>
            </div>
          )}

          <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message... (e.g., 'I want to return my order')"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </form>
        </section>

        {/* Right Panel - Escalation Queue */}
        <aside className="w-full lg:w-1/2 flex flex-col min-w-0 bg-slate-900/30">
          <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold text-white">Automated Agent Escalation Queue</h2>
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{tickets.length} tickets</span>
            </div>
            <button
              onClick={fetchTickets}
              disabled={isRefreshingTickets}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
              title="Refresh tickets"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshingTickets ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            {tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Shield className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg">No Escalated Tickets</p>
                <p className="text-sm mt-1 text-center px-8">
                  Tickets appear here when the AI cannot resolve a customer query
                  or detects frustration requiring human attention.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors animate-slide-up"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-amber-400" />
                        <div>
                          <div className="font-medium text-white">Ticket #{ticket.id}</div>
                          <div className="text-xs text-slate-400">{new Date(ticket.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColor(ticket.priority)} whitespace-nowrap`}>
                        {ticket.priority}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                      <div className="bg-slate-900/50 rounded-lg p-2">
                        <div className="text-slate-400 text-xs">Category</div>
                        <div className="text-white capitalize flex items-center gap-1">
                          {ticket.category === 'Technical' && <Settings className="w-3.5 h-3.5" />}
                          {ticket.category === 'Billing' && <Users className="w-3.5 h-3.5" />}
                          {ticket.category === 'Refund' && <AlertCircle className="w-3.5 h-3.5" />}
                          {ticket.category === 'General' && <MessageSquare className="w-3.5 h-3.5" />}
                          {ticket.category}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-2">
                        <div className="text-slate-400 text-xs">Sentiment</div>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${sentimentColor(ticket.sentiment).replace('border-', '')}`}>
                          {ticket.sentiment}
                        </span>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-2">
                        <div className="text-slate-400 text-xs">Status</div>
                        <span className={ticket.status === 'Resolved'
                          ? 'inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30'}>
                          {ticket.status}
                        </span>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-2">
                        <div className="text-slate-400 text-xs">Session</div>
                        <div className="text-white text-xs font-mono truncate">{ticket.session_id}</div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-slate-400 text-xs mb-1">AI Summary</div>
                      <p className="text-white text-sm bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                        {ticket.summary}
                      </p>
                    </div>

                    <div className="mb-3">
                      <div className="text-slate-400 text-xs mb-1">Customer Query</div>
                      <p className="text-slate-200 text-sm bg-slate-900/50 p-3 rounded-lg border border-slate-700 whitespace-pre-wrap">
                        {ticket.customer_query}
                      </p>
                    </div>

                    {ticket.status !== 'Resolved' && (
                      <button
                        onClick={() => handleResolve(ticket.id)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark Resolved
                      </button>
                    )}
                    {ticket.status === 'Resolved' && (
                      <div className="w-full flex items-center justify-center gap-2 text-green-400 bg-green-500/10 border border-green-500/20 py-2.5 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-medium">Resolved</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  )
}

export default App