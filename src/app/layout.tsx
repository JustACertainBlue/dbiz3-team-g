import './tokens.css'
import './globals.css'
import './screen-specs.css'
import './product-ui.css'
import './shell.css'
import React from 'react'
import { fontVariables } from './fonts'

export const metadata = {
  title: 'Hanoi Artisan Bridge — Nền tảng Kết nối Làng nghề Hà Nội',
  description: 'Hệ sinh thái kết nối các nghệ nhân làng nghề truyền thống Hà Nội với các công ty du lịch quốc tế và địa phương.',
}

import SessionHeader from './components/SessionHeader'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={fontVariables}>
      <body>
        <SessionHeader />
        <div id="page-content">{children}</div>
      </body>
    </html>
  )
}
