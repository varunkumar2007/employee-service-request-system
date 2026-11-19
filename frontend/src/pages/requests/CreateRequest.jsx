import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import {
  PlusCircle,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Building,
  Tag,
  Flag
} from 'lucide-react';

const PRIORITY_MULTIPLIERS = {
  LOW: 1.5,
  MEDIUM: 1.0,
  HIGH: 0.5,
  URGENT: 0.25
};

export default function CreateRequest() {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdTicket, setCreatedTicket] = useState(null);

  // Fetch departments and categories on mount
  useEffect(() => {
    async function loadFormMetadata() {
      try {
        const [deptsRes, catsRes] = await Promise.all([
          api.get('/departments'),
          api.get('/categories')
        ]);

        const depts = deptsRes?.data?.departments || [];
        const cats = catsRes?.data?.categories || [];

        setDepartments(depts);
        setCategories(cats);

        if (depts.length > 0) {
          setSelectedDeptId(depts[0].id);
        }
      } catch (err) {
        console.error('Failed to load request metadata:', err);
        setError('Failed to load departments and categories. Please refresh.');
      } finally {
        setLoadingData(false);
      }
    }
    loadFormMetadata();
  }, []);

  // Filter categories by selected department
  const availableCategories = categories.filter(
    cat => cat.departmentId === selectedDeptId
  );

  // Auto-select first category when department changes
  useEffect(() => {
    if (availableCategories.length > 0) {
      // If current selected category is not in availableCategories, reset to first
      if (!availableCategories.some(c => c.id === selectedCategoryId)) {
        setSelectedCategoryId(availableCategories[0].id);
      }
    } else {
      setSelectedCategoryId('');
    }
  }, [selectedDeptId, availableCategories, selectedCategoryId]);

  // Selected category object for SLA preview
  const currentCategory = categories.find(c => c.id === selectedCategoryId);

  // Estimated SLA hours
  const calculateEstimatedSla = () => {
    if (!currentCategory) return null;
    const baseHours = currentCategory.defaultSlaHours || 24;
    const multiplier = PRIORITY_MULTIPLIERS[priority] || 1.0;
    const effectiveHours = Math.max(1, Math.round(baseHours * multiplier));
    return effectiveHours;
  };

  const estimatedSlaHours = calculateEstimatedSla();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !selectedCategoryId) {
      setError('Please provide a title, description, and select a category.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post('/requests', {
        title: title.trim(),
        description: description.trim(),
        categoryId: selectedCategoryId,
        priority
      });

      if (res?.data?.request) {
        setCreatedTicket(res.data.request);
      } else {
        navigate('/requests');
      }
    } catch (err) {
      console.error('Create Request Error:', err);
      setError(err.message || 'Failed to submit service request. Please verify inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdTicket) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#dcfce7',
            color: '#16a34a',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Request Submitted Successfully!
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '24px' }}>
            Your service request has been registered and routed to the department triage queue.
          </p>

          <div style={{
            padding: '16px',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            marginBottom: '28px'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Assigned Ticket Number:</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb', letterSpacing: '0.05em' }}>
              {createdTicket.ticketNumber}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '6px' }}>
              {createdTicket.title}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                setCreatedTicket(null);
                setTitle('');
                setDescription('');
              }}
              className="btn btn-secondary"
            >
              Submit Another Request
            </button>
            <Link to={`/requests/${createdTicket.id}`} className="btn btn-primary">
              View Ticket Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header with back link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: '#475569'
          }}
          title="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Create Service Request
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '2px 0 0 0' }}>
            Submit an issue or inquiry to our internal support teams.
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#b91c1c',
          fontSize: '0.875rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Department and Category row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              <Building size={14} style={{ color: '#2563eb' }} />
              <span>Target Department *</span>
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              disabled={loadingData}
              required
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              <Tag size={14} style={{ color: '#2563eb' }} />
              <span>Request Category *</span>
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              disabled={loadingData || availableCategories.length === 0}
              required
            >
              {availableCategories.length === 0 ? (
                <option value="">No categories available for this department</option>
              ) : (
                availableCategories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.defaultSlaHours}h default SLA)
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Priority Selection */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
            <Flag size={14} style={{ color: '#2563eb' }} />
            <span>Priority Level *</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {[
              { id: 'LOW', label: 'Low', desc: '1.5x SLA duration', color: '#475569', activeBorder: '#94a3b8' },
              { id: 'MEDIUM', label: 'Medium', desc: 'Standard SLA', color: '#2563eb', activeBorder: '#3b82f6' },
              { id: 'HIGH', label: 'High', desc: '0.5x accelerated', color: '#b45309', activeBorder: '#f59e0b' },
              { id: 'URGENT', label: 'Urgent', desc: '0.25x critical SLA', color: '#b91c1c', activeBorder: '#ef4444' }
            ].map(p => {
              const isSelected = priority === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: `2px solid ${isSelected ? p.activeBorder : '#e2e8f0'}`,
                    backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: p.color }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                    {p.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic SLA Preview Callout */}
        {estimatedSlaHours && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            color: '#1e40af',
            fontSize: '0.8125rem'
          }}>
            <Clock size={16} />
            <span>
              <strong>Estimated Resolution Target:</strong> ~{estimatedSlaHours} hours SLA for {priority.toLowerCase()} priority.
            </span>
          </div>
        )}

        {/* Title input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Request Title / Summary *
          </label>
          <input
            type="text"
            placeholder="e.g. Dual monitor HDMI display cable not working"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
            required
          />
        </div>

        {/* Description textarea */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Detailed Description *
          </label>
          <textarea
            rows={5}
            placeholder="Provide context, error messages, device model, or steps taken..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Submit Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !selectedCategoryId}
          >
            <PlusCircle size={16} />
            <span>{submitting ? 'Submitting Request...' : 'Submit Request'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
