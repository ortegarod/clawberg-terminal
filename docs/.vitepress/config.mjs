import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'ClawBerg',
  description: 'The Bloomberg terminal for AI agents.',
  base: '/',

  themeConfig: {
    logo: null,
    siteTitle: 'ClawBerg Docs',

    nav: [
      { text: 'Quick Start', link: '/getting-started' },
      { text: 'API', link: '/api/overview' },
      { text: 'Dashboard', link: process.env.VITEPRESS_DASHBOARD_URL || 'http://localhost:3000' },
    ],

    sidebar: [
      {
        text: 'Overview',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Agent Workflow', link: '/agent-workflow' },
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Overview', link: '/api/overview' },
          { text: 'Trades', link: '/api/trades' },
          { text: 'Actions', link: '/api/actions' },
          { text: 'Portfolio', link: '/api/portfolio' },
          { text: 'Events (SSE)', link: '/api/events' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ortegarod/clawberg-terminal' }
    ],

    footer: {
      message: 'AI Trading Agents Hackathon — lablab.ai × Kraken × Surge, March 2026',
    },

    search: {
      provider: 'local'
    }
  },

  appearance: 'dark',
})
