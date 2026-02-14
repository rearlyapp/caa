export type CaseStatus = "draft" | "extracting" | "reviewing" | "complete"

export interface DirectorDocument {
  id: string
  type: "pan" | "aadhaar" | "photo" | "signature"
  fileName: string
  fileUrl: string
  status: "pending" | "processing" | "done" | "error"
  extractedData?: Record<string, string>
}

export interface PanData {
  name: string
  fathers_name: string
  date_of_birth: string
  pan_number: string
}

export interface AadhaarData {
  name: string
  aadhaar_number: string
  date_of_birth: string
  gender: string
  address: string
}

export interface DirectorInfo {
  // AI-extracted fields
  panData?: PanData
  aadhaarData?: AadhaarData
  documents: DirectorDocument[]
  validated: boolean

  // Manual fields
  placeOfBirth: string
  nationality: string
  residentOfIndia: string
  occupation: string
  education: string
  sharesSubscribed: string
  durationAtAddress: string
  email: string
  mobile: string
  dinNumber: string
}

export interface CompanyInfo {
  electricityBillUploaded: boolean
  latitude: string
  longitude: string
  nocUploaded: boolean
  officeEmail: string
  officeMobile: string
  authorizedShareCapital: string
  paidUpShareCapital: string
  objectives: string
  otherObjectives: string
}

export interface ProfessionalInfo {
  name: string
  membershipNo: string
  address: string
}

export interface Case {
  id: string
  name: string
  createdAt: string
  status: CaseStatus
  directors: [DirectorInfo, DirectorInfo]
  companyInfo: CompanyInfo
  professionalInfo: ProfessionalInfo
  inferenceMode: "modal" | "cpu"
}

export function createEmptyDirector(): DirectorInfo {
  return {
    documents: [],
    validated: false,
    placeOfBirth: "",
    nationality: "Indian",
    residentOfIndia: "Yes",
    occupation: "",
    education: "",
    sharesSubscribed: "",
    durationAtAddress: "",
    email: "",
    mobile: "",
    dinNumber: "",
  }
}

export function createEmptyCase(name: string): Case {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    status: "draft",
    directors: [createEmptyDirector(), createEmptyDirector()],
    companyInfo: {
      electricityBillUploaded: false,
      latitude: "",
      longitude: "",
      nocUploaded: false,
      officeEmail: "",
      officeMobile: "",
      authorizedShareCapital: "",
      paidUpShareCapital: "",
      objectives:
        "To carry on the business of trading, importing, exporting, manufacturing, distributing and dealing in all types of goods, commodities, products and services.",
      otherObjectives: "",
    },
    professionalInfo: {
      name: "",
      membershipNo: "",
      address: "",
    },
    inferenceMode: "modal",
  }
}
