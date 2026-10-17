'use client'

import React from 'react'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '24px',
        background: 'radial-gradient(ellipse at top, #1E293B 0%, #0F172A 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '28px',
            marginBottom: '8px',
            color: '#F1F5F9',
          }}
        >
          Sign In
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '24px' }}>
          Hanoi Artisan Bridge — B2B Tour Agency Portal
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#CBD5E1', marginBottom: '6px' }}>
            Agency Account ID
          </label>
          <input
            id="login-account-id"
            type="text"
            defaultValue="agency-hanoi-tours-001"
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#0F172A',
              color: '#F8FAFC',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <Link
          id="login-submit-btn"
          href="/ai-matching"
          style={{
            display: 'block',
            textAlign: 'center',
            backgroundColor: '#D97706',
            color: '#FFFFFF',
            padding: '12px',
            borderRadius: '8px',
            fontWeight: 600,
            textDecoration: 'none',
            marginTop: '20px',
            transition: 'all 0.2s ease',
          }}
        >
          Continue as Authenticated Agency
        </Link>
      </div>
    </div>
  )
}
