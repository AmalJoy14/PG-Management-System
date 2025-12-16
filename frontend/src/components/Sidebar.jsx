"use client"

import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"
import styles from "./Sidebar.module.css"

const Sidebar = ({ activeTab, setActiveTab, tabs }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>PG Management</h2>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{user?.fullname}</div>
          <div className={styles.userRole}>{user?.category}</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.navItem} ${activeTab === tab.id ? styles.active : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <button onClick={handleLogout} className={styles.logoutButton}>
        Logout
      </button>
    </div>
  )
}

export default Sidebar
