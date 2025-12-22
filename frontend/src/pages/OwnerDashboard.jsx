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
  const [selectedTenant, setSelectedTenant] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [onlyUnpaid, setOnlyUnpaid] = useState(true)
  const [selectedComplaintTenant, setSelectedComplaintTenant] = useState("")
  const [onlyPendingComplaints, setOnlyPendingComplaints] = useState(true)
  const [newTenant, setNewTenant] = useState({
    name: "",
    email: "",
    password: "",
    roomNumber: "",
    rentAmount: "",
    securityDeposit: "",
    joinDate: "",
  })
  const [rooms, setRooms] = useState([])
  const [editingTenantId, setEditingTenantId] = useState("")
  const [editRentAmount, setEditRentAmount] = useState("")
  const [settlements, setSettlements] = useState([])
  const [newSettlement, setNewSettlement] = useState({ tenantId: "", damages: "", cleaning: "", noticePenalty: "", other: "", notes: "" })

  const tabs = [
    { id: "tenants", label: "Tenants" },
    { id: "payments", label: "Payments" },
    { id: "complaints", label: "Complaints" },
    { id: "settlements", label: "Settlements" },
  ]

  useEffect(() => {
    fetchData()
  }, [activeTab])

  useEffect(() => {
    if (activeTab === "payments") {
      fetchData()
    }
  }, [selectedTenant, selectedMonth, onlyUnpaid])

  useEffect(() => {
    if (activeTab === "complaints") {
      fetchData()
    }
  }, [selectedComplaintTenant, onlyPendingComplaints])

  const fetchData = async () => {
    setLoading(true)
    setError("")
    try {
      if (activeTab === "tenants") {
        const response = await axiosInstance.get("/tenants")
        setTenants(response.data.tenants || [])
        // Load rooms for dropdown
        try {
          const roomsRes = await axiosInstance.get("/rooms")
          setRooms(roomsRes.data || [])
        } catch (e) {
          // non-fatal for tenants view
        }
      } else if (activeTab === "payments") {
        // Load tenants for dropdown
        const tenantsResponse = await axiosInstance.get("/tenants")
        setTenants(tenantsResponse.data.tenants || [])
        
        // Load payments with optional tenant filter
        const params = new URLSearchParams()
        if (selectedTenant) params.append("tenantId", selectedTenant)
        if (selectedMonth) params.append("month", selectedMonth)
        if (onlyUnpaid) params.append("unpaid", "1")
        const url = params.toString() ? `/payments?${params.toString()}` : "/payments"
        const response = await axiosInstance.get(url)
        setPayments(response.data)
      } else if (activeTab === "complaints") {
        // Load tenants for dropdown
        const tenantsResponse = await axiosInstance.get("/tenants")
        setTenants(tenantsResponse.data.tenants || [])

        const params = new URLSearchParams()
        if (selectedComplaintTenant) params.append("tenantId", selectedComplaintTenant)
        if (onlyPendingComplaints) params.append("status", "pending")
        const url = params.toString() ? `/complaints?${params.toString()}` : "/complaints"

        const response = await axiosInstance.get(url)
        setComplaints(response.data)
      } else if (activeTab === "settlements") {
        // Load tenants for dropdown
        const tenantsResponse = await axiosInstance.get("/tenants")
        setTenants(tenantsResponse.data.tenants || [])

        const params = new URLSearchParams()
        if (newSettlement.tenantId) params.append("tenantId", newSettlement.tenantId)
        const response = await axiosInstance.get(params.toString() ? `/settlements?${params.toString()}` : "/settlements")
        setSettlements(response.data)
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
      const payload = { ...newTenant }
      await axiosInstance.post("/add-tenant", payload)
      setNewTenant({ name: "", email: "", password: "", roomNumber: "", rentAmount: "", securityDeposit: "", joinDate: "" })
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

  const handleGeneratePayments = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await axiosInstance.post("/payments/generate-all")
      alert(response.data.message)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate payments")
    } finally {
      setLoading(false)
    }
  }

  const startEditRent = (tenant) => {
    setEditingTenantId(tenant._id)
    setEditRentAmount(tenant.rentAmount)
  }

  const cancelEditRent = () => {
    setEditingTenantId("")
    setEditRentAmount("")
  }

  const saveEditRent = async (tenantId) => {
    try {
      setLoading(true)
      setError("")
      await axiosInstance.patch(`/tenants/${tenantId}/rent`, {
        rentAmount: Number(editRentAmount),
      })
      cancelEditRent()
      await fetchData()
      alert("Rent updated")
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update rent")
    } finally {
      setLoading(false)
    }
  }

  const handleInitiateSettlement = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError("")
      const payload = {
        tenantId: newSettlement.tenantId,
        damages: Number(newSettlement.damages || 0),
        cleaning: Number(newSettlement.cleaning || 0),
        noticePenalty: Number(newSettlement.noticePenalty || 0),
        other: Number(newSettlement.other || 0),
        notes: newSettlement.notes || undefined,
      }
      await axiosInstance.post("/settlements/initiate", payload)
      setNewSettlement({ tenantId: "", damages: "", cleaning: "", noticePenalty: "", other: "", notes: "" })
      await fetchData()
      alert("Settlement initiated")
    } catch (err) {
      setError(err.response?.data?.message || "Failed to initiate settlement")
    } finally {
      setLoading(false)
    }
  }

  const handleApproveSettlement = async (id) => {
    try {
      setLoading(true)
      setError("")
      await axiosInstance.patch(`/settlements/${id}/approve`, {})
      await fetchData()
      alert("Settlement approved")
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve settlement")
    } finally {
      setLoading(false)
    }
  }

  const handlePaySettlement = async (id) => {
    try {
      setLoading(true)
      setError("")
      await axiosInstance.patch(`/settlements/${id}/pay`, { paymentMethod: "upi" })
      await fetchData()
      alert("Settlement marked paid")
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark settlement paid")
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
                  <select
                    value={newTenant.roomNumber}
                    onChange={(e) => setNewTenant({ ...newTenant, roomNumber: e.target.value })}
                    required
                    className={styles.select}
                  >
                    <option value="" disabled>Select Room</option>
                    {Array.from({ length: 15 }, (_, i) => String(i + 1)).map((num) => {
                      const existing = rooms.find((r) => String(r.roomNumber) === num)
                      const available = existing ? !!existing.available : true
                      return (
                        <option
                          key={num}
                          value={num}
                          disabled={!available}
                          style={{ color: available ? '#27ae60' : '#c0392b' }}
                        >
                          {num} {available ? '(Available)' : '(Occupied)'}
                        </option>
                      )
                    })}
                  </select>
                  <input
                    type="number"
                    placeholder="Rent Amount"
                    value={newTenant.rentAmount}
                    onChange={(e) => setNewTenant({ ...newTenant, rentAmount: e.target.value })}
                    required
                    className={styles.input}
                  />
                  <input
                    type="number"
                    placeholder="Security Deposit (optional)"
                    value={newTenant.securityDeposit}
                    onChange={(e) => setNewTenant({ ...newTenant, securityDeposit: e.target.value })}
                    className={styles.input}
                  />
                  <div className={styles.dateInputGroup}>
                    <input
                      type="date"
                      placeholder="Join Date"
                      value={newTenant.joinDate}
                      onChange={(e) => setNewTenant({ ...newTenant, joinDate: e.target.value })}
                      required
                      className={styles.input}
                    />
                    <button
                      type="button"
                      onClick={() => setNewTenant({ ...newTenant, joinDate: new Date().toISOString().split('T')[0] })}
                      className={styles.todayButton}
                    >
                      Today
                    </button>
                  </div>
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
                      <th>Actions</th>
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
                          <td>
                            {editingTenantId === tenant._id ? (
                              <div className={styles.inlineEdit}>
                                <input
                                  type="number"
                                  value={editRentAmount}
                                  onChange={(e) => setEditRentAmount(e.target.value)}
                                  className={styles.input}
                                  style={{ maxWidth: 120 }}
                                />
                                <button type="button" onClick={() => saveEditRent(tenant._id)} className={styles.submitButton}>Save</button>
                                <button type="button" onClick={cancelEditRent} className={styles.markPaidButton}>Cancel</button>
                              </div>
                            ) : (
                              <>
                                ₹{tenant.rentAmount}
                              </>
                            )}
                          </td>
                          <td>{new Date(tenant.joinDate).toLocaleDateString()}</td>
                          <td>
                            {editingTenantId === tenant._id ? null : (
                              <>
                                <button type="button" onClick={() => startEditRent(tenant)} className={styles.markPaidButton}>Update Rent</button>
                              </>
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

        {activeTab === "settlements" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Deposit Settlements</h2>
            </div>

            <div className={styles.formCard}>
              <h3>Initiate Settlement</h3>
              <form onSubmit={handleInitiateSettlement} className={styles.form}>
                <select
                  value={newSettlement.tenantId}
                  onChange={(e) => setNewSettlement({ ...newSettlement, tenantId: e.target.value })}
                  required
                  className={styles.select}
                >
                  <option value="" disabled>Select Tenant</option>
                  {tenants.map((t) => (
                    <option key={t._id} value={t._id}>{t.name} - Room {t.roomNumber}</option>
                  ))}
                </select>
                <input type="number" className={styles.input} placeholder="Damages" value={newSettlement.damages} onChange={(e) => setNewSettlement({ ...newSettlement, damages: e.target.value })} />
                <input type="number" className={styles.input} placeholder="Cleaning" value={newSettlement.cleaning} onChange={(e) => setNewSettlement({ ...newSettlement, cleaning: e.target.value })} />
                <input type="number" className={styles.input} placeholder="Notice Penalty" value={newSettlement.noticePenalty} onChange={(e) => setNewSettlement({ ...newSettlement, noticePenalty: e.target.value })} />
                <input type="number" className={styles.input} placeholder="Other" value={newSettlement.other} onChange={(e) => setNewSettlement({ ...newSettlement, other: e.target.value })} />
                <input type="text" className={styles.input} placeholder="Notes (optional)" value={newSettlement.notes} onChange={(e) => setNewSettlement({ ...newSettlement, notes: e.target.value })} />
                <button type="submit" className={styles.submitButton} disabled={loading}>{loading ? "Submitting..." : "Initiate"}</button>
              </form>
            </div>

            <div className={styles.table}>
              <table>
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Room</th>
                    <th>Deposit</th>
                    <th>Unpaid Due</th>
                    <th>Other Deductions</th>
                    <th>Refund</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.length === 0 ? (
                    <tr><td colSpan="8" className={styles.empty}>No settlements yet</td></tr>
                  ) : (
                    settlements.map((s) => {
                      const unpaid = s.deductions?.unpaidDue || 0
                      const others = (s.deductions?.damages || 0) + (s.deductions?.cleaning || 0) + (s.deductions?.noticePenalty || 0) + (s.deductions?.other || 0)
                      return (
                        <tr key={s._id}>
                          <td>{s.tenantId?.fullname || s.tenantName || "N/A"}</td>
                          <td>{s.roomId?.roomNumber || s.roomNumber || "N/A"}</td>
                          <td>₹{s.depositAmount}</td>
                          <td>₹{unpaid}</td>
                          <td>₹{others}</td>
                          <td>₹{s.refundableAmount}</td>
                          <td><span className={`${styles.badge} ${styles[s.status === 'paid' ? 'paid' : (s.status === 'approved' ? 'pending' : 'overdue')]}`}>{s.status}</span></td>
                          <td>
                            {s.status === 'initiated' && (
                              <button className={styles.markPaidButton} onClick={() => handleApproveSettlement(s._id)}>Approve</button>
                            )}
                            {s.status === 'approved' && (
                              <button className={styles.submitButton} onClick={() => handlePaySettlement(s._id)}>Mark Paid</button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Payment Records</h2>
              <div className={styles.paymentControls}>
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className={styles.tenantSelect}
                >
                  <option value="">All Tenants</option>
                  {tenants.map((tenant) => (
                    <option key={tenant._id} value={tenant._id}>
                      {tenant.name} - Room {tenant.roomNumber}
                    </option>
                  ))}
                </select>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={styles.tenantSelect}
                />
                <label className={styles.inlineToggle}>
                  <input
                    type="checkbox"
                    checked={onlyUnpaid}
                    onChange={(e) => setOnlyUnpaid(e.target.checked)}
                  />
                  <span>Only unpaid</span>
                </label>
                <button onClick={handleGeneratePayments} className={styles.generateButton}>
                  Generate Payment Records
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className={styles.loading}>Loading payments...</div>
            ) : (
              <div className={styles.table}>
                <table>
                  <thead>
                    <tr>
                      <th>Tenant Name</th>
                      <th>Room</th>
                      <th>Month</th>
                      <th>Amount</th>
                      <th>Due Date</th>
                      <th>Paid Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan="7" className={styles.empty}>
                          No payment records found. Click "Generate Payment Records" to create them.
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment.id}>
                          <td>{payment.tenant_name || "N/A"}</td>
                          <td>{payment.room_number}</td>
                          <td>{payment.month}</td>
                          <td>₹{payment.amount}</td>
                          <td>{new Date(payment.dueDate).toLocaleDateString()}</td>
                          <td>{payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : "-"}</td>
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
            <div className={styles.sectionHeader}>
              <h2>Maintenance Complaints</h2>
              <div className={styles.paymentControls}>
                <select
                  value={selectedComplaintTenant}
                  onChange={(e) => setSelectedComplaintTenant(e.target.value)}
                  className={styles.tenantSelect}
                >
                  <option value="">All Tenants</option>
                  {tenants.map((tenant) => (
                    <option key={tenant._id} value={tenant._id}>
                      {tenant.name} - Room {tenant.roomNumber}
                    </option>
                  ))}
                </select>
                <label className={styles.inlineToggle}>
                  <input
                    type="checkbox"
                    checked={onlyPendingComplaints}
                    onChange={(e) => setOnlyPendingComplaints(e.target.checked)}
                  />
                  <span>Only pending</span>
                </label>
              </div>
            </div>
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
                        <span className={styles.complaintRoom}>Room {complaint.room_number || "N/A"}</span>
                        <span className={styles.complaintDate}>
                          {new Date(complaint.createdAt || complaint.created_at).toLocaleDateString()}
                        </span>
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
