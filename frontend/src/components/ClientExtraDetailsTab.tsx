/**
 * ClientExtraDetailsTab - Extra details form for bank application forms.
 * Shows personal info, work details, and references.
 */

import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertCircle, Save } from 'lucide-react'
import { useClientExtraDetails, useUpdateClientExtraDetails } from '@/hooks/useClients'
import { FormField } from '@/components/ui/FormField'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useAuth } from '@/contexts/AuthContext'
import type { MaritalStatus, EmploymentType, UpdateClientExtraDetailsData } from '@/types/mortgage'

interface ClientExtraDetailsTabProps {
  clientId: string
  employmentType: EmploymentType | null
  viewOnly?: boolean
}

const MARITAL_STATUS_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
]

export function ClientExtraDetailsTab({ clientId, employmentType, viewOnly: viewOnlyProp }: ClientExtraDetailsTabProps) {
  const { can } = useAuth()
  const isReadOnly = viewOnlyProp || !can('update', 'clients')
  const { data: extraDetails, isLoading, error, refetch } = useClientExtraDetails(clientId)
  const updateMutation = useUpdateClientExtraDetails()

  // Personal Information
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | ''>('')
  const [spouseName, setSpouseName] = useState('')
  const [spouseContact, setSpouseContact] = useState('')
  const [dependents, setDependents] = useState('')
  const [childrenCount, setChildrenCount] = useState('')
  const [childrenInSchool, setChildrenInSchool] = useState('')
  const [qualification, setQualification] = useState('')
  const [mailingAddress, setMailingAddress] = useState('')
  const [motherMaidenName, setMotherMaidenName] = useState('')

  // Work Details
  const [jobTitle, setJobTitle] = useState('')
  const [companyIndustry, setCompanyIndustry] = useState('')
  const [yearsInOccupation, setYearsInOccupation] = useState('')
  const [yearsInCurrentCompany, setYearsInCurrentCompany] = useState('')
  const [yearsInBusiness, setYearsInBusiness] = useState('')
  const [companyEmployeeCount, setCompanyEmployeeCount] = useState('')
  const [officeAddress, setOfficeAddress] = useState('')
  const [officePoBox, setOfficePoBox] = useState('')
  const [officeLandline, setOfficeLandline] = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [companyHrEmail, setCompanyHrEmail] = useState('')

  // References
  const [ref1Name, setRef1Name] = useState('')
  const [ref1Relationship, setRef1Relationship] = useState('')
  const [ref1Mobile, setRef1Mobile] = useState('')
  const [ref2Name, setRef2Name] = useState('')
  const [ref2Relationship, setRef2Relationship] = useState('')
  const [ref2Mobile, setRef2Mobile] = useState('')

  const [saveError, setSaveError] = useState<string | null>(null)

  // Initialize form with extra details data
  useEffect(() => {
    if (extraDetails) {
      setMaritalStatus(extraDetails.marital_status || '')
      setSpouseName(extraDetails.spouse_name || '')
      setSpouseContact(extraDetails.spouse_contact || '')
      setDependents(extraDetails.dependents?.toString() || '')
      setChildrenCount(extraDetails.children_count?.toString() || '')
      setChildrenInSchool(extraDetails.children_in_school?.toString() || '')
      setQualification(extraDetails.qualification || '')
      setMailingAddress(extraDetails.mailing_address || '')
      setMotherMaidenName(extraDetails.mother_maiden_name || '')

      setJobTitle(extraDetails.job_title || '')
      setCompanyIndustry(extraDetails.company_industry || '')
      setYearsInOccupation(extraDetails.years_in_occupation?.toString() || '')
      setYearsInCurrentCompany(extraDetails.years_in_current_company?.toString() || '')
      setYearsInBusiness(extraDetails.years_in_business?.toString() || '')
      setCompanyEmployeeCount(extraDetails.company_employee_count?.toString() || '')
      setOfficeAddress(extraDetails.office_address || '')
      setOfficePoBox(extraDetails.office_po_box || '')
      setOfficeLandline(extraDetails.office_landline || '')
      setWorkEmail(extraDetails.work_email || '')
      setCompanyHrEmail(extraDetails.company_hr_email || '')

      setRef1Name(extraDetails.ref_1_name || '')
      setRef1Relationship(extraDetails.ref_1_relationship || '')
      setRef1Mobile(extraDetails.ref_1_mobile || '')
      setRef2Name(extraDetails.ref_2_name || '')
      setRef2Relationship(extraDetails.ref_2_relationship || '')
      setRef2Mobile(extraDetails.ref_2_mobile || '')
    }
  }, [extraDetails])

  const handleSave = useCallback(async () => {
    setSaveError(null)

    const data: UpdateClientExtraDetailsData = {
      marital_status: maritalStatus || undefined,
      spouse_name: spouseName || undefined,
      spouse_contact: spouseContact || undefined,
      dependents: dependents ? parseInt(dependents) : null,
      children_count: childrenCount ? parseInt(childrenCount) : null,
      children_in_school: childrenInSchool ? parseInt(childrenInSchool) : null,
      qualification: qualification || undefined,
      mailing_address: mailingAddress || undefined,
      mother_maiden_name: motherMaidenName || undefined,

      job_title: jobTitle || undefined,
      company_industry: companyIndustry || undefined,
      years_in_occupation: yearsInOccupation ? parseInt(yearsInOccupation) : null,
      years_in_current_company: yearsInCurrentCompany ? parseInt(yearsInCurrentCompany) : null,
      years_in_business: yearsInBusiness ? parseInt(yearsInBusiness) : null,
      company_employee_count: companyEmployeeCount ? parseInt(companyEmployeeCount) : null,
      office_address: officeAddress || undefined,
      office_po_box: officePoBox || undefined,
      office_landline: officeLandline || undefined,
      work_email: workEmail || undefined,
      company_hr_email: companyHrEmail || undefined,

      ref_1_name: ref1Name || undefined,
      ref_1_relationship: ref1Relationship || undefined,
      ref_1_mobile: ref1Mobile || undefined,
      ref_2_name: ref2Name || undefined,
      ref_2_relationship: ref2Relationship || undefined,
      ref_2_mobile: ref2Mobile || undefined,
    }

    try {
      await updateMutation.mutateAsync({ clientId, data })
      await refetch()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    }
  }, [
    clientId, updateMutation, refetch,
    maritalStatus, spouseName, spouseContact, dependents, childrenCount, childrenInSchool,
    qualification, mailingAddress, motherMaidenName,
    jobTitle, companyIndustry, yearsInOccupation, yearsInCurrentCompany, yearsInBusiness,
    companyEmployeeCount, officeAddress, officePoBox, officeLandline, workEmail, companyHrEmail,
    ref1Name, ref1Relationship, ref1Mobile, ref2Name, ref2Relationship, ref2Mobile,
  ])

  const isSalaried = employmentType === 'salaried'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <AlertCircle className="h-6 w-6 text-red-400" />
        <p className="text-sm text-gray-500">Failed to load extra details</p>
        <button onClick={() => refetch()} className="text-xs text-[#1e3a5f] hover:underline">
          Retry
        </button>
      </div>
    )
  }

  const inputClass = "w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e3a5f] disabled:bg-gray-50"

  return (
    <div className="space-y-4">
      {saveError && (
        <div className="p-2 bg-red-50 border border-red-100 rounded text-red-600 text-xs flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" />
          {saveError}
        </div>
      )}

      {/* Family & Personal */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Family & Personal</h3>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Marital Status">
            <SearchableSelect
              value={maritalStatus}
              onChange={(val) => setMaritalStatus(val as MaritalStatus | '')}
              options={[{ value: '', label: 'Select...' }, ...MARITAL_STATUS_OPTIONS]}
              disabled={isReadOnly}
              hideSearch
            />
          </FormField>
          <FormField label="Dependents">
            <input type="number" min="0" value={dependents} onChange={(e) => setDependents(e.target.value)} disabled={isReadOnly} className={inputClass} />
          </FormField>
          <FormField label="Children">
            <input type="number" min="0" value={childrenCount} onChange={(e) => setChildrenCount(e.target.value)} disabled={isReadOnly} className={inputClass} />
          </FormField>
          <FormField label="In School">
            <input type="number" min="0" value={childrenInSchool} onChange={(e) => setChildrenInSchool(e.target.value)} disabled={isReadOnly} className={inputClass} />
          </FormField>
          {maritalStatus === 'married' && (
            <>
              <FormField label="Spouse Name" className="col-span-2">
                <input type="text" value={spouseName} onChange={(e) => setSpouseName(e.target.value)} disabled={isReadOnly} className={inputClass} />
              </FormField>
              <FormField label="Spouse Contact" className="col-span-2">
                <input type="text" value={spouseContact} onChange={(e) => setSpouseContact(e.target.value)} disabled={isReadOnly} className={inputClass} />
              </FormField>
            </>
          )}
          <FormField label="Qualification" className="col-span-2">
            <input type="text" value={qualification} onChange={(e) => setQualification(e.target.value)} disabled={isReadOnly} placeholder="e.g., Bachelor's, Master's" className={inputClass} />
          </FormField>
          <FormField label="Mother's Maiden Name" className="col-span-2">
            <input type="text" value={motherMaidenName} onChange={(e) => setMotherMaidenName(e.target.value)} disabled={isReadOnly} className={inputClass} />
          </FormField>
          <FormField label="Mailing Address" className="col-span-3">
            <input type="text" value={mailingAddress} onChange={(e) => setMailingAddress(e.target.value)} disabled={isReadOnly} placeholder="Correspondence address" className={inputClass} />
          </FormField>
        </div>
      </div>

      {/* Work Details */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Employment Details</h3>
        <div className="grid grid-cols-3 gap-3">
          {isSalaried && (
            <FormField label="Job Title" className="col-span-2">
              <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} disabled={isReadOnly} className={inputClass} />
            </FormField>
          )}
          <FormField label="Industry" className={isSalaried ? "col-span-2" : "col-span-2"}>
            <input type="text" value={companyIndustry} onChange={(e) => setCompanyIndustry(e.target.value)} disabled={isReadOnly} placeholder="e.g., Technology" className={inputClass} />
          </FormField>
          {!isSalaried && (
            <FormField label="Years in Business" className="col-span-2">
              <input type="number" min="0" value={yearsInBusiness} onChange={(e) => setYearsInBusiness(e.target.value)} disabled={isReadOnly} className={inputClass} />
            </FormField>
          )}
          {isSalaried && (
            <>
              <FormField label="Years in Occupation">
                <input type="number" min="0" value={yearsInOccupation} onChange={(e) => setYearsInOccupation(e.target.value)} disabled={isReadOnly} className={inputClass} />
              </FormField>
              <FormField label="Years in Company">
                <input type="number" min="0" value={yearsInCurrentCompany} onChange={(e) => setYearsInCurrentCompany(e.target.value)} disabled={isReadOnly} className={inputClass} />
              </FormField>
            </>
          )}
          <FormField label="Employees">
            <input type="number" min="0" value={companyEmployeeCount} onChange={(e) => setCompanyEmployeeCount(e.target.value)} disabled={isReadOnly} className={inputClass} />
          </FormField>
          <FormField label="Office Landline">
            <input type="text" value={officeLandline} onChange={(e) => setOfficeLandline(e.target.value)} disabled={isReadOnly} className={inputClass} />
          </FormField>
          <FormField label="Office Address" className="col-span-3">
            <input type="text" value={officeAddress} onChange={(e) => setOfficeAddress(e.target.value)} disabled={isReadOnly} className={inputClass} />
          </FormField>
          <FormField label="PO Box">
            <input type="text" value={officePoBox} onChange={(e) => setOfficePoBox(e.target.value)} disabled={isReadOnly} className={inputClass} />
          </FormField>
          {isSalaried && (
            <>
              <FormField label="Work Email" className="col-span-2">
                <input type="email" value={workEmail} onChange={(e) => setWorkEmail(e.target.value)} disabled={isReadOnly} className={inputClass} />
              </FormField>
              <FormField label="HR Email" className="col-span-2">
                <input type="email" value={companyHrEmail} onChange={(e) => setCompanyHrEmail(e.target.value)} disabled={isReadOnly} className={inputClass} />
              </FormField>
            </>
          )}
        </div>
      </div>

      {/* References */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">References</h3>
        <div className="space-y-4">
          {/* Reference 1 */}
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Name">
              <input type="text" value={ref1Name} onChange={(e) => setRef1Name(e.target.value)} disabled={isReadOnly} className={inputClass} />
            </FormField>
            <FormField label="Relationship">
              <input type="text" value={ref1Relationship} onChange={(e) => setRef1Relationship(e.target.value)} disabled={isReadOnly} placeholder="e.g., Friend" className={inputClass} />
            </FormField>
            <FormField label="Mobile">
              <input type="text" value={ref1Mobile} onChange={(e) => setRef1Mobile(e.target.value)} disabled={isReadOnly} className={inputClass} />
            </FormField>
          </div>
          {/* Reference 2 */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
            <FormField label="Name">
              <input type="text" value={ref2Name} onChange={(e) => setRef2Name(e.target.value)} disabled={isReadOnly} className={inputClass} />
            </FormField>
            <FormField label="Relationship">
              <input type="text" value={ref2Relationship} onChange={(e) => setRef2Relationship(e.target.value)} disabled={isReadOnly} placeholder="e.g., Colleague" className={inputClass} />
            </FormField>
            <FormField label="Mobile">
              <input type="text" value={ref2Mobile} onChange={(e) => setRef2Mobile(e.target.value)} disabled={isReadOnly} className={inputClass} />
            </FormField>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {!isReadOnly && (
        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {updateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4" />Save Extra Details</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
