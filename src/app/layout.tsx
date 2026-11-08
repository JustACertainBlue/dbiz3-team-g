import './tokens.css'
import './globals.css'
import './screen-specs.css'
import './product-ui.css'
import React from 'react'

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
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SessionHeader />
        <div id="page-content">{children}</div>
        <footer style={{padding:"24px",textAlign:"center",fontSize:12,color:"#526456"}}><a href="/image-credits">Nguồn ảnh · Ảnh minh họa cho dữ liệu mẫu</a></footer>
      </body>
    </html>
  )
}
