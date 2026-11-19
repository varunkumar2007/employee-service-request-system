import { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Building2,
  Layers,
  PlusCircle,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // New Category Form State
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDeptId, setCatDeptId] = useState('');
  const [catSlaHours, setCatSlaHours] = useState('24');
  const [catSubmitting, setCatSubmitting] = useState(false);

  // New Department Form State
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptSubmitting, setDeptSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [deptsRes, catsRes] = await Promise.all([
        api.get('/departments'),
        api.get('/categories')
      ]);

      if (deptsRes?.data?.departments) {
        setDepartments(deptsRes.data.departments);

        if (
          deptsRes.data.departments.length > 0 &&
          !catDeptId
        ) {
          setCatDeptId(deptsRes.data.departments[0].id);
        }
      }

      if (catsRes?.data?.categories) {
        setCategories(catsRes.data.categories);
      }
    } catch (err) {
      console.error(
        'Failed to load department management data:',
        err
      );
      setError(
        err.message ||
        'Failed to load departments and categories.'
      );
    } finally {
      setLoading(false);
    }
  }, [catDeptId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Category Creation
  const handleCreateCategory = async (e) => {
    e.preventDefault();

    if (!catName.trim() || !catDeptId || !catSlaHours) {
      return;
    }

    setCatSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/categories', {
        name: catName.trim(),
        departmentId: catDeptId,
        defaultSlaHours: parseInt(catSlaHours, 10)
      });

      setSuccess(
        `Category '${catName.trim()}' created successfully.`
      );
      setShowCatModal(false);
      setCatName('');
      setCatSlaHours('24');

      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to create category.');
    } finally {
      setCatSubmitting(false);
    }
  };

  // Handle Department Creation
  const handleCreateDepartment = async (e) => {
    e.preventDefault();

    if (!deptName.trim() || !deptCode.trim()) {
      return;
    }

    setDeptSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/departments', {
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
        description: deptDesc.trim() || undefined
      });

      setSuccess(
        `Department '${deptName.trim()}' created successfully.`
      );
      setShowDeptModal(false);
      setDeptName('');
      setDeptCode('');
      setDeptDesc('');

      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to create department.');
    } finally {
      setDeptSubmitting(false);
    }
  };

  // Toggle Category Status (Active/Inactive)
  const handleToggleCategory = async (cat) => {
    try {
      await api.patch(`/categories/${cat.id}/status`, {
        isActive: !cat.isActive
      });

      setSuccess(
        `Category '${cat.name}' is now ${
          !cat.isActive ? 'Active' : 'Inactive'
        }.`
      );

      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update category status.');
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh'
        }}
      >
        <LoadingSpinner message="Loading departments & SLA configurations..." />
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}
    >
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '24px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#f3e8ff',
              color: '#9333ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Building2 size={24} />
          </div>

          <div>
            <h1
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 4px 0'
              }}
            >
              Departments &amp; SLA Catalog
            </h1>

            <p
              style={{
                fontSize: '0.85rem',
                color: '#64748b',
                margin: 0
              }}
            >
              Configure company departments, service categories,
              and baseline SLA resolution hours.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowDeptModal(true)}
            className="btn btn-secondary"
          >
            <PlusCircle size={14} />
            <span>New Department</span>
          </button>

          <button
            onClick={() => setShowCatModal(true)}
            className="btn btn-primary"
          >
            <PlusCircle size={14} />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '0.85rem'
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            color: '#166534',
            fontSize: '0.85rem'
          }}
        >
          {success}
        </div>
      )}

      {/* Modals */}
      {showDeptModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '440px',
              width: '100%',
              padding: '24px'
            }}
          >
            <h2
              style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '16px'
              }}
            >
              Create Department
            </h2>

            <form
              onSubmit={handleCreateDepartment}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  Department Name *
                </label>

                <input
                  type="text"
                  placeholder="e.g. Facilities Management"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  Department Code *
                </label>

                <input
                  type="text"
                  placeholder="e.g. DEPT-FAC"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  Description
                </label>

                <input
                  type="text"
                  placeholder="Building access, maintenance and physical equipment"
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'flex-end',
                  marginTop: '10px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={deptSubmitting}
                  className="btn btn-primary"
                >
                  {deptSubmitting
                    ? 'Creating...'
                    : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCatModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '440px',
              width: '100%',
              padding: '24px'
            }}
          >
            <h2
              style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: '16px'
              }}
            >
              Create Service Category
            </h2>

            <form
              onSubmit={handleCreateCategory}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  Category Name *
                </label>

                <input
                  type="text"
                  placeholder="e.g. Network &amp; VPN Access"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  Department *
                </label>

                <select
                  value={catDeptId}
                  onChange={(e) => setCatDeptId(e.target.value)}
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: '4px'
                  }}
                >
                  Default Resolution SLA (Hours) *
                </label>

                <input
                  type="number"
                  min="1"
                  max="168"
                  value={catSlaHours}
                  onChange={(e) => setCatSlaHours(e.target.value)}
                  required
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'flex-end',
                  marginTop: '10px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={catSubmitting}
                  className="btn btn-primary"
                >
                  {catSubmitting
                    ? 'Creating...'
                    : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Two Column Layout: Departments and Categories */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '20px'
        }}
      >
        {/* Departments List */}
        <div className="card" style={{ padding: 0 }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#0f172a',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Building2
                size={16}
                style={{ color: '#2563eb' }}
              />
              Active Departments ({departments.length})
            </h2>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {departments.map((dept) => (
              <div
                key={dept.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: '#0f172a',
                      fontSize: '0.9rem'
                    }}
                  >
                    {dept.name}
                  </div>

                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: '#64748b',
                      marginTop: '2px'
                    }}
                  >
                    Code:{' '}
                    <strong style={{ color: '#2563eb' }}>
                      {dept.code}
                    </strong>{' '}
                    • {dept.description || 'Standard department'}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: dept.isActive
                      ? '#dcfce7'
                      : '#fee2e2',
                    color: dept.isActive
                      ? '#15803d'
                      : '#b91c1c'
                  }}
                >
                  {dept.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Categories List */}
        <div className="card" style={{ padding: 0 }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#0f172a',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Layers
                size={16}
                style={{ color: '#2563eb' }}
              />
              Service Categories &amp; SLA ({categories.length})
            </h2>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {categories.map((cat) => (
              <div
                key={cat.id}
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: cat.isActive ? 1 : 0.6
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: '#0f172a',
                      fontSize: '0.875rem'
                    }}
                  >
                    {cat.name}
                  </div>

                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: '#64748b',
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>Dept: {cat.department?.code || ''}</span>
                    <span>•</span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontWeight: 600,
                        color: '#2563eb'
                      }}
                    >
                      <Clock size={12} />
                      {cat.defaultSlaHours}h SLA
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleCategory(cat)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: cat.isActive
                      ? '#10b981'
                      : '#94a3b8'
                  }}
                  title={
                    cat.isActive
                      ? 'Deactivate Category'
                      : 'Activate Category'
                  }
                >
                  {cat.isActive
                    ? <ToggleRight size={28} />
                    : <ToggleLeft size={28} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}