"use client"

import { useState, useEffect } from "react"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import axiosInstance from "../api/axios"
import styles from "./TenantDashboard.module.css"

const TenantDashboard = () => {
  const [activeTab, setActiveTab] = useState("profile")
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [newComplaint, setNewComplaint] = useState("")

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "payments", label: "Payment History" },
    { id: "complaints", label: "Complaints" },
  ]

  useEffect(() => {
    if (activeTab === "payments") {
      fetchPayments()
    } else if (activeTab === "complaints") {
      fetchComplaints()
    }
  }, [activeTab])

  const fetchPayments = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await axiosInstance.get("/payments/my-payments")
      setPayments(response.data)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch payments")
    } finally {
      setLoading(false)
    }
  }

  const fetchComplaints = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await axiosInstance.get("/complaints/my-complaints")
      setComplaints(response.data)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch complaints")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComplaint = async (e) => {
    e.preventDefault()
    if (!newComplaint.trim()) return

    setLoading(true)
    setError("")

    try {
      await axiosInstance.post("/complaints", { complaint: newComplaint })
      setNewComplaint("")
      fetchComplaints()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit complaint")
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async (paymentId) => {
    setLoading(true)
    setError("")
    try {
      await axiosInstance.patch(`/payments/${paymentId}`, { status: "paid" })
      alert("Payment successful!")
      fetchPayments()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process payment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />

      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {activeTab === "profile" && "My Profile"}
            {activeTab === "payments" && "Payment History"}
            {activeTab === "complaints" && "My Complaints"}
          </h1>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {activeTab === "profile" && (
          <div className={styles.section}>
            <div className={styles.profileCard}>
              <div className={styles.profileHeader}>
                <div className={styles.avatar}>{user?.fullname?.charAt(0).toUpperCase()}</div>
                <div>
                  <h2 className={styles.profileName}>{user?.fullname}</h2>
                  <p className={styles.profileRole}>Tenant</p>
                </div>
              </div>
              <div className={styles.profileDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Email:</span>
                  <span className={styles.detailValue}>{user?.email}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>User ID:</span>
                  <span className={styles.detailValue}>{user?.id}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Account Type:</span>
                  <span className={styles.detailValue}>{user?.category}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className={styles.section}>
            {loading ? (
              <div className={styles.loading}>Loading payment history...</div>
            ) : (
              <div className={styles.table}>
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Amount</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan="5" className={styles.empty}>
                          No payment records found
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment._id || payment.id}>
                          <td>{payment.month}</td>
                          <td>₹{payment.amount}</td>
                          <td>{new Date(payment.dueDate).toLocaleDateString()}</td>
                          <td>
                            <span className={`${styles.badge} ${styles[payment.status]}`}>{payment.status}</span>
                          </td>
                          <td>
                            {payment.status !== "paid" && (
                              <button
                                onClick={() => handlePayment(payment._id || payment.id)}
                                className={styles.payButton}
                                disabled={loading}
                              >
                                Pay Now
                              </button>
                            )}
                            {payment.status === "paid" && (
                              <span className={styles.paidText}>✓ Paid</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "complaints" && (
          <div className={styles.section}>
            <div className={styles.complaintForm}>
              <h3>Raise a New Complaint</h3>
              <form onSubmit={handleSubmitComplaint}>
                <textarea
                  value={newComplaint}
                  onChange={(e) => setNewComplaint(e.target.value)}
                  placeholder="Describe your maintenance issue..."
                  className={styles.textarea}
                  rows="4"
                  required
                />
                <button type="submit" disabled={loading} className={styles.submitButton}>
                  {loading ? "Submitting..." : "Submit Complaint"}
                </button>
              </form>
            </div>

            <div className={styles.complaintsSection}>
              <h3>My Complaints</h3>
              {loading ? (
                <div className={styles.loading}>Loading complaints...</div>
              ) : complaints.length === 0 ? (
                <div className={styles.empty}>No complaints submitted yet</div>
              ) : (
                <div className={styles.complaintsGrid}>
                  {complaints.map((complaint) => (
                    <div key={complaint._id || complaint.id} className={styles.complaintCard}>
                      <div className={styles.complaintHeader}>
                        <span className={styles.complaintDate}>
                          {new Date(complaint.createdAt || complaint.created_at).toLocaleDateString()}
                        </span>
                        <span className={`${styles.badge} ${styles[complaint.status]}`}>{complaint.status}</span>
                      </div>
                      <p className={styles.complaintText}>{complaint.complaint}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TenantDashboard
