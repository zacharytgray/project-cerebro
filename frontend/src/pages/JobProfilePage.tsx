import { useState, useEffect } from 'react';
import { User, Save, FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';

interface JobProfile {
  profile: {
    personal: {
      full_name: string;
      email: string;
      phone: string;
      location: {
        city: string;
        state: string;
        country: string;
        zip_code: string;
      };
      linkedin_url: string;
      portfolio_url: string;
      github_url: string;
    };
    work_authorization: {
      authorized_to_work_us: boolean;
      requires_visa_sponsorship: boolean;
      willing_to_relocate: boolean;
      open_to_remote: boolean;
    };
    experience: {
      years_total: number;
      current_title: string;
      industry: string;
      specializations: string[];
    };
    education: {
      highest_degree: string;
      field_of_study: string;
      university: string;
      graduation_year: number;
    };
    skills: {
      programming_languages: string[];
      frameworks: string[];
      tools: string[];
      soft_skills: string[];
    };
    preferences: {
      job_types: string[];
      work_arrangement: string[];
      salary_expectations: {
        minimum: number;
        currency: string;
        period: string;
      };
      industries_of_interest: string[];
      deal_breakers: string[];
    };
    documents: {
      resume_path: string;
    };
  };
  search_criteria: {
    job_titles: string[];
    keywords_required: string[];
    keywords_preferred: string[];
    keywords_excluded: string[];
    experience_levels: string[];
    company_blacklist: string[];
  };
}

export function JobProfilePage() {
  const [profile, setProfile] = useState<JobProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    fetch('/api/job-profile')
      .then((r) => r.json())
      .then((data) => {
        setProfile(data.profile || getDefaultProfile());
        setLoading(false);
      })
      .catch(() => {
        setProfile(getDefaultProfile());
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await fetch('/api/job-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      setLastSaved(new Date());
    } catch (e) {
      console.error('Failed to save profile:', e);
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = (path: string, value: any) => {
    if (!profile) return;
    const newProfile = { ...profile };
    const parts = path.split('.');
    let cur: any = newProfile;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
    setProfile(newProfile);
  };

  const updateArray = (path: string, value: string) => {
    const arr = value.split(',').map((s) => s.trim()).filter(Boolean);
    updateProfile(path, arr);
  };

  if (loading || !profile) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <User className="w-8 h-8 text-blue-400" />
            Job Profile
          </h1>
          <p className="text-muted-foreground">
            Your profile is used by the Job Application Brain for applications
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-muted-foreground">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </header>

      {/* Personal Info */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <Input
              value={profile.profile.personal.full_name}
              onChange={(e) => updateProfile('profile.personal.full_name', e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              value={profile.profile.personal.email}
              onChange={(e) => updateProfile('profile.personal.email', e.target.value)}
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={profile.profile.personal.phone}
              onChange={(e) => updateProfile('profile.personal.phone', e.target.value)}
              placeholder="+1-555-123-4567"
            />
          </div>
          <div>
            <label className="text-sm font-medium">City</label>
            <Input
              value={profile.profile.personal.location.city}
              onChange={(e) => updateProfile('profile.personal.location.city', e.target.value)}
              placeholder="San Francisco"
            />
          </div>
          <div>
            <label className="text-sm font-medium">State</label>
            <Input
              value={profile.profile.personal.location.state}
              onChange={(e) => updateProfile('profile.personal.location.state', e.target.value)}
              placeholder="CA"
            />
          </div>
          <div>
            <label className="text-sm font-medium">LinkedIn URL</label>
            <Input
              value={profile.profile.personal.linkedin_url}
              onChange={(e) => updateProfile('profile.personal.linkedin_url', e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">GitHub URL</label>
            <Input
              value={profile.profile.personal.github_url}
              onChange={(e) => updateProfile('profile.personal.github_url', e.target.value)}
              placeholder="https://github.com/..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Portfolio URL</label>
            <Input
              value={profile.profile.personal.portfolio_url}
              onChange={(e) => updateProfile('profile.personal.portfolio_url', e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      </Card>

      {/* Work Authorization */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Work Authorization</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Authorized to work in US</div>
              <div className="text-xs text-muted-foreground">No sponsorship required</div>
            </div>
            <Toggle
              checked={profile.profile.work_authorization.authorized_to_work_us}
              onChange={(v) => updateProfile('profile.work_authorization.authorized_to_work_us', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Requires Visa Sponsorship</div>
            </div>
            <Toggle
              checked={profile.profile.work_authorization.requires_visa_sponsorship}
              onChange={(v) => updateProfile('profile.work_authorization.requires_visa_sponsorship', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Willing to Relocate</div>
            </div>
            <Toggle
              checked={profile.profile.work_authorization.willing_to_relocate}
              onChange={(v) => updateProfile('profile.work_authorization.willing_to_relocate', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Open to Remote</div>
            </div>
            <Toggle
              checked={profile.profile.work_authorization.open_to_remote}
              onChange={(v) => updateProfile('profile.work_authorization.open_to_remote', v)}
            />
          </div>
        </div>
      </Card>

      {/* Experience */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Experience</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Years of Experience</label>
            <Input
              type="number"
              value={profile.profile.experience.years_total}
              onChange={(e) => updateProfile('profile.experience.years_total', parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Current Title</label>
            <Input
              value={profile.profile.experience.current_title}
              onChange={(e) => updateProfile('profile.experience.current_title', e.target.value)}
              placeholder="Software Engineer"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Industry</label>
            <Input
              value={profile.profile.experience.industry}
              onChange={(e) => updateProfile('profile.experience.industry', e.target.value)}
              placeholder="Technology"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Specializations (comma-separated)</label>
            <Input
              value={profile.profile.experience.specializations.join(', ')}
              onChange={(e) => updateArray('profile.experience.specializations', e.target.value)}
              placeholder="Backend, API Design, ML"
            />
          </div>
        </div>
      </Card>

      {/* Education */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Education</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Highest Degree</label>
            <select
              value={profile.profile.education.highest_degree}
              onChange={(e) => updateProfile('profile.education.highest_degree', e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary"
            >
              <option value="">Select...</option>
              <option value="High School">High School</option>
              <option value="Associate's">Associate's</option>
              <option value="Bachelor's">Bachelor's</option>
              <option value="Master's">Master's</option>
              <option value="PhD">PhD</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Field of Study</label>
            <Input
              value={profile.profile.education.field_of_study}
              onChange={(e) => updateProfile('profile.education.field_of_study', e.target.value)}
              placeholder="Computer Science"
            />
          </div>
          <div>
            <label className="text-sm font-medium">University</label>
            <Input
              value={profile.profile.education.university}
              onChange={(e) => updateProfile('profile.education.university', e.target.value)}
              placeholder="University of..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Graduation Year</label>
            <Input
              type="number"
              value={profile.profile.education.graduation_year || ''}
              onChange={(e) => updateProfile('profile.education.graduation_year', parseInt(e.target.value) || 0)}
              placeholder="2024"
            />
          </div>
        </div>
      </Card>

      {/* Skills */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Skills</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Programming Languages (comma-separated)</label>
            <Input
              value={profile.profile.skills.programming_languages.join(', ')}
              onChange={(e) => updateArray('profile.skills.programming_languages', e.target.value)}
              placeholder="Python, JavaScript, Go"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Frameworks (comma-separated)</label>
            <Input
              value={profile.profile.skills.frameworks.join(', ')}
              onChange={(e) => updateArray('profile.skills.frameworks', e.target.value)}
              placeholder="React, Django, Node.js"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tools (comma-separated)</label>
            <Input
              value={profile.profile.skills.tools.join(', ')}
              onChange={(e) => updateArray('profile.skills.tools', e.target.value)}
              placeholder="Docker, AWS, Git"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Soft Skills (comma-separated)</label>
            <Input
              value={profile.profile.skills.soft_skills.join(', ')}
              onChange={(e) => updateArray('profile.skills.soft_skills', e.target.value)}
              placeholder="Communication, Leadership"
            />
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Minimum Salary ($)</label>
            <Input
              type="number"
              value={profile.profile.preferences.salary_expectations.minimum || ''}
              onChange={(e) => updateProfile('profile.preferences.salary_expectations.minimum', parseInt(e.target.value) || 0)}
              placeholder="100000"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Industries of Interest (comma-separated)</label>
            <Input
              value={profile.profile.preferences.industries_of_interest.join(', ')}
              onChange={(e) => updateArray('profile.preferences.industries_of_interest', e.target.value)}
              placeholder="Tech, Fintech, Healthcare"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Deal Breakers (comma-separated)</label>
            <Input
              value={profile.profile.preferences.deal_breakers.join(', ')}
              onChange={(e) => updateArray('profile.preferences.deal_breakers', e.target.value)}
              placeholder="No remote, On-call 24/7"
            />
          </div>
        </div>
      </Card>

      {/* Search Criteria */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Search Criteria</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Job Titles to Search (comma-separated)</label>
            <Input
              value={profile.search_criteria.job_titles.join(', ')}
              onChange={(e) => updateArray('search_criteria.job_titles', e.target.value)}
              placeholder="Software Engineer, Backend Developer"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Required Keywords (comma-separated)</label>
            <Input
              value={profile.search_criteria.keywords_required.join(', ')}
              onChange={(e) => updateArray('search_criteria.keywords_required', e.target.value)}
              placeholder="python, api"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Preferred Keywords (comma-separated)</label>
            <Input
              value={profile.search_criteria.keywords_preferred.join(', ')}
              onChange={(e) => updateArray('search_criteria.keywords_preferred', e.target.value)}
              placeholder="aws, kubernetes"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Excluded Keywords (comma-separated)</label>
            <Input
              value={profile.search_criteria.keywords_excluded.join(', ')}
              onChange={(e) => updateArray('search_criteria.keywords_excluded', e.target.value)}
              placeholder="java, frontend-only"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Experience Levels (comma-separated)</label>
            <Input
              value={profile.search_criteria.experience_levels.join(', ')}
              onChange={(e) => updateArray('search_criteria.experience_levels', e.target.value)}
              placeholder="mid-level, senior"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Company Blacklist (comma-separated)</label>
            <Input
              value={profile.search_criteria.company_blacklist.join(', ')}
              onChange={(e) => updateArray('search_criteria.company_blacklist', e.target.value)}
              placeholder="Companies to avoid"
            />
          </div>
        </div>
      </Card>

      {/* Documents */}
      <Card>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documents
        </h2>
        <div>
          <label className="text-sm font-medium">Resume Path</label>
          <Input
            value={profile.profile.documents.resume_path}
            onChange={(e) => updateProfile('profile.documents.resume_path', e.target.value)}
            placeholder="~/Documents/resume.pdf"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Path to your resume file on the server
          </p>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="primary" size="lg" onClick={handleSave} disabled={saving}>
          <Save className="w-5 h-5 mr-2" />
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
}

function getDefaultProfile(): JobProfile {
  return {
    profile: {
      personal: {
        full_name: '',
        email: '',
        phone: '',
        location: { city: '', state: '', country: 'USA', zip_code: '' },
        linkedin_url: '',
        portfolio_url: '',
        github_url: '',
      },
      work_authorization: {
        authorized_to_work_us: true,
        requires_visa_sponsorship: false,
        willing_to_relocate: false,
        open_to_remote: true,
      },
      experience: {
        years_total: 0,
        current_title: '',
        industry: '',
        specializations: [],
      },
      education: {
        highest_degree: '',
        field_of_study: '',
        university: '',
        graduation_year: 0,
      },
      skills: {
        programming_languages: [],
        frameworks: [],
        tools: [],
        soft_skills: [],
      },
      preferences: {
        job_types: ['full-time'],
        work_arrangement: ['remote', 'hybrid'],
        salary_expectations: { minimum: 0, currency: 'USD', period: 'annual' },
        industries_of_interest: [],
        deal_breakers: [],
      },
      documents: { resume_path: '' },
    },
    search_criteria: {
      job_titles: [],
      keywords_required: [],
      keywords_preferred: [],
      keywords_excluded: [],
      experience_levels: [],
      company_blacklist: [],
    },
  };
}
