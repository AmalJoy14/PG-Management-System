"use client"

import { useState, useEffect } from "react"
import Sidebar from "../components/Sidebar"
import axiosInstance from "../api/axios"
import styles from "./OwnerDashboard.module.css"

const OwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState("tenants")
  const [tenants, setTenants] = useState([])
  const [payments, setPayments] = useState([])
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showAddTenant, setShowAddTenant] = useState(false)
  const [newTenant, setNewTenant] = useState({
    name: "",
    email: "",
    password: "",
    roomNumber: "",
    rentAmount: "",
  })

  const tabs = [
    { id: "tenants", label: "Tenants" },
    { id: "payments", label: "Payments" },
    { id: "complaints", label: "Complaints" },
  ]

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    setError("")
    try {
      if (activeTab === "tenants") {
        const response = await axiosInstance.get("/tenants")
        setTenants(response.data.tenants || [])
      } else if (activeTab === "payments") {
        const response = await axiosInstance.get("/payments")
        setPayments(response.data)
      } else if (activeTab === "complaints") {
        const response = await axiosInstance.get("/complaints")
        setComplaints(response.data)
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }

  const handleAddTenant = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await axiosInstance.post("/add-tenant", newTenant)
      setNewTenant({ name: "", email: "", password: "", roomNumber: "", rentAmount: "" })
      setShowAddTenant(false)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add tenant")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateComplaintStatus = async (complaintId, newStatus) => {
    try {
      await axiosInstance.patch(`/complaints/${complaintId}`, { status: newStatus })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update complaint")
    }
  }

  return (
    <div className={styles.container}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />

      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {activeTab === "tenants" && "Tenants Management"}
            {activeTab === "payments" && "Payment Status"}
            {activeTab === "complaints" && "Maintenance Complaints"}
          </h1>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {activeTab === "tenants" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>All Tenants</h2>
              <button onClick={() => setShowAddTenant(!showAddTenant)} className={styles.addButton}>
                {showAddTenant ? "Cancel" : "Add New Tenant"}
              </button>
            </div>

            {showAddTenant && (
              <div className={styles.formCard}>
                <h3>Add New Tenant</h3>
                <form onSubmit={handleAddTenant} className={styles.form}>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newTenant.name}
                    onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                    required
                    className={styles.input}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newTenant.email}
                    onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                    required
                    className={styles.input}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newTenant.password}
                    onChange={(e) => setNewTenant({ ...newTenant, password: e.target.value })}
                    required
                    minLength="6"
                    className={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="Room Number"
                    value={newTenant.roomNumber}
                    onChange={(e) => setNewTenant({ ...newTenant, roomNumber: e.target.value })}
                    required
                    className={styles.input}
                  />
                  <input
                    type="number"
                    placeholder="Rent Amount"
                    value={newTenant.rentAmount}
                    onChange={(e) => setNewTenant({ ...newTenant, rentAmount: e.target.value })}
                    required
                    className={styles.input}
                  />
                  <button type="submit" disabled={loading} className={styles.submitButton}>
                    {loading ? "Adding..." : "Add Tenant"}
                  </button>
                </form>
              </div>
            )}

            {loading ? (
              <div className={styles.loading}>Loading tenants...</div>
            ) : (
              <div className={styles.table}>
                <table>
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Room Number</th>
                      <th>Rent Amount</th>
                      <th>Join Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.length === 0 ? (
                      <tr>
                        <td colSpan="5" className={styles.empty}>
                          No tenants found
                        </td>
                      </tr>
                    ) : (
                      tenants.map((tenant) => (
                        <tr key={tenant._id}>
                          <td>{tenant.name}</td>
                          <td>{tenant.email}</td>
                          <td>{tenant.roomNumber}</td>
                          <td>₹{tenant.rentAmount}</td>
                          <td>{new Date(tenant.joinDate).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <div className={styles.section}>
            {loading ? (
              <div className={styles.loading}>Loading payments...</div>
            ) : (
              <div className={styles.table}>
                <table>
                  <thead>
                    <tr>
                      <th>Tenant Name</th>
                      <th>Month</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan="3" className={styles.empty}>
                          No payment records found
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment.id}>
                          <td>{payment.tenant_name || "N/A"}</td>
                          <td>{payment.month}</td>
                          <td>
                            <span className={`${styles.badge} ${styles[payment.status]}`}>{payment.status}</span>
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
            {loading ? (
              <div className={styles.loading}>Loading complaints...</div>
            ) : (
              <div className={styles.complaintsGrid}>
                {complaints.length === 0 ? (
                  <div className={styles.empty}>No complaints found</div>
                ) : (
                  complaints.map((complaint) => (
                    <div key={complaint.id} className={styles.complaintCard}>
                      <div className={styles.complaintHeader}>
                        <span className={styles.complaintUser}>{complaint.tenant_name || "Unknown Tenant"}</span>
                        <span className={`${styles.badge} ${styles[complaint.status]}`}>{complaint.status}</span>
                      </div>
                      <p className={styles.complaintText}>{complaint.complaint}</p>
                      <div className={styles.complaintActions}>
                        {complaint.status === "pending" && (
                          <button
                            onClick={() => handleUpdateComplaintStatus(complaint.id, "resolved")}
                            className={styles.resolveButton}
                          >
                            Mark as Resolved
                          </button>
                        )}
                        {complaint.status === "resolved" && (
                          <button
                            onClick={() => handleUpdateComplaintStatus(complaint.id, "pending")}
                            className={styles.pendingButton}
                          >
                            Mark as Pending
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default OwnerDashboard
