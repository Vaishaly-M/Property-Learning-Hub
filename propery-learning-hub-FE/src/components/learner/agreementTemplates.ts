// components/learner/agreementTemplates.ts
// Fixed-content legal/agreement templates. Unlike the Q&A business templates,
// these render their full original text and are only lightly editable (via
// the rich-text editor) rather than being generated from answered questions.

export interface AgreementTemplateData {
  id: string;
  name: string;
  description: string;
  type: 'document';
  sections: any[];
  defaultQuestions: any[];
  content: string;
  isCustom?: boolean;
}

const LEGAL_STYLE = `
<style>
  .fp-legal-doc {
    font-family: Georgia, 'Times New Roman', serif;
    color: #000000 !important;
    line-height: 1.7;
    padding: 30px 40px 100px 40px;
    background: #ffffff;
    max-width: 100%;
    box-sizing: border-box;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: normal !important;
    hyphens: none !important;
  }
  .fp-legal-doc * {
    box-sizing: border-box;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: normal !important;
    hyphens: none !important;
    max-width: 100%;
    color: #000000 !important;
  }
  .fp-legal-doc h1 {
    text-align: center;
    font-size: 22px;
    font-weight: 700 !important;
    letter-spacing: 0.5px;
    margin: 0 0 16px 0;
    text-transform: uppercase;
    color: #000000 !important;
  }
  .fp-legal-doc .fp-subtitle {
    text-align: center;
    font-style: italic;
    color: #333333 !important;
    font-size: 13px;
    margin: 0 0 10px 0;
  }
  .fp-legal-doc .fp-notice {
    text-align: center;
    font-style: italic;
    color: #4a4a4a !important;
    font-size: 12px;
    margin: 0 0 24px 0;
  }
  .fp-legal-doc .fp-dated {
    font-size: 13px;
    margin-bottom: 22px;
    color: #000000 !important;
  }
  .fp-legal-doc h2 {
    font-size: 17px;
    font-weight: 700 !important;
    color: #000000 !important;
    margin: 34px 0 14px 0;
    border-bottom: 1px solid #cbd5e0;
    padding: 0 0 8px 0;
  }
  .fp-legal-doc h3 {
    font-size: 15px;
    font-weight: 700 !important;
    color: #000000 !important;
    margin: 28px 0 12px 0;
  }
  .fp-legal-doc h4 {
    font-size: 14px;
    font-weight: 700 !important;
    color: #000000 !important;
    margin: 22px 0 10px 0;
  }
  .fp-legal-doc p {
    font-size: 13px;
    margin: 12px 0;
    text-align: justify;
    color: #000000 !important;
  }
  .fp-legal-doc ul {
    margin: 12px 0 18px 0;
    padding-left: 28px;
  }
  .fp-legal-doc ol {
    margin: 12px 0 18px 0;
    padding-left: 28px;
  }
  .fp-legal-doc li {
    font-size: 13px;
    margin-bottom: 8px;
    text-align: justify;
    color: #000000 !important;
  }
  .fp-legal-doc table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 20px 0;
    font-size: 13px;
  }
  .fp-legal-doc th, .fp-legal-doc td {
    border: 1px solid #cbd5e0;
    padding: 10px 12px;
    text-align: left;
    color: #000000 !important;
  }
  .fp-legal-doc th { 
    background: #f7fafc;
    font-weight: 600 !important;
  }
  .fp-legal-doc .fp-sig {
    margin: 24px 0 8px 0;
    font-size: 13px;
    color: #000000 !important;
  }
  .fp-legal-doc .fp-note {
    font-size: 12px;
    color: #4a4a4a !important;
    font-style: italic;
    margin: 10px 0 18px 0;
  }
  .fp-legal-doc strong {
    font-weight: 700 !important;
    color: #000000 !important;
  }
  .fp-legal-doc b {
    font-weight: 700 !important;
    color: #000000 !important;
  }
  /* Page break handling */
  .fp-legal-doc h1,
  .fp-legal-doc h2,
  .fp-legal-doc h3,
  .fp-legal-doc h4 {
    page-break-after: avoid;
  }
  .fp-legal-doc table {
    page-break-inside: avoid;
  }
  .fp-legal-doc ul,
  .fp-legal-doc ol {
    page-break-inside: avoid;
  }
  /* keeps the last block from being clipped */
  .fp-legal-doc > *:last-child { 
    margin-bottom: 0; 
  }
  .fp-legal-doc .fp-bottom-spacer {
    height: 100px;
    width: 100%;
  }
  @media print {
    .fp-legal-doc {
      padding: 20px 25px 80px 25px;
    }
    .fp-legal-doc .fp-bottom-spacer {
      height: 80px;
    }
  }
</style>
`;

const wrap = (body: string) =>
  `${LEGAL_STYLE}<div class="fp-legal-doc">${body}<div class="fp-bottom-spacer"></div></div>`;


// ---------------------------------------------------------------------------
// 1 & 4. Company Let Agreement (Serviced Accommodation) — versions 1 and 2
// (Both uploaded files contain identical text.)
// ---------------------------------------------------------------------------
const COMPANY_LET_BODY = `
  <h1>Company Let Agreement</h1>
  <p class="fp-subtitle">(Tenancy Agreement for Letting to a Company for Serviced Accommodation Use)</p>
  <p class="fp-notice">This is a common law tenancy. It is not an Assured Shorthold Tenancy and is not governed by the Renters' Rights Act 2025.</p>
  <p class="fp-dated">Dated: [insert date]</p>

  <h2>Parties</h2>
  <p>(1) [Landlord full name / company name], of [Landlord address] ("the Landlord"); and</p>
  <p>(2) [Tenant Company name], a company registered in England and Wales under company number [•], whose registered office is at [Tenant Company registered office address] ("the Tenant").</p>

  <h2>Background</h2>
  <p>The Landlord owns the property described in Schedule 1 ("the Property"). The Tenant carries on a business that includes letting or licensing furnished residential accommodation to paying guests on a short-term basis ("Serviced Accommodation"). The Landlord agrees to let the Property to the Tenant, and the Tenant agrees to take the Property, on the terms of this Agreement, for the Tenant's own business purposes, including operating the Property as Serviced Accommodation.</p>

  <h2>Schedule 1 — The Property</h2>
  <p>Address: [insert full postal address]</p>
  <p>Title number (if registered): [insert HM Land Registry title number, if known]</p>
  <p>Brief description: [insert — e.g. number of bedrooms/bathrooms, any parking, any shared areas]</p>

  <h2>Schedule 2 — Inventory and Schedule of Condition</h2>
  <p>[Attach a detailed, dated inventory and schedule of condition, ideally with photographs, prepared and agreed by both parties before the Tenant takes occupation. This schedule is the primary evidence used to assess deposit deductions under clause 5.]</p>

  <h2>Important Notes Before Signing (not a contractual clause)</h2>
  <p>This template covers the core terms of a company let. Before relying on it, each party should separately confirm the following, since they affect whether this Agreement can safely be used as intended:</p>
  <ul>
    <li>Landlord: check with your mortgage lender (if any) and buildings insurer that letting to a company for Serviced Accommodation / short-term guest use is permitted and will not affect your cover or your mortgage terms.</li>
    <li>Tenant: confirm the local authority's position on planning use, any Article 4 direction, and any mandatory short-term letting registration or licensing scheme that applies to the Property's area, and budget for compliance.</li>
    <li>Both parties: this Agreement is drafted on the basis the Term does not exceed 3 years and will not be registered at HM Land Registry. If a longer term is agreed, it should be executed as a deed and may require registration — ask a solicitor to amend the execution clause accordingly.</li>
    <li>Right to Rent: since the Tenant is a company rather than an individual, routine Home Office "right to rent" checks on the Tenant do not apply in the way they would for an individual tenant. If specific individuals are to occupy the Property on a long-term basis (rather than short-stay Guests), take separate advice on whether checks apply to them.</li>
  </ul>

  <h2>1. Definitions and Interpretation</h2>
  <p><strong>1.1</strong> "the Property" means the premises described in Schedule 1, together with the fixtures, fittings, and furniture listed in Schedule 2.</p>
  <p><strong>1.2</strong> "the Term" means the period set out in clause 3.</p>
  <p><strong>1.3</strong> "Rent" means the sum set out in clause 4.</p>
  <p><strong>1.4</strong> "Guest" means any individual to whom the Tenant grants short-term occupation of the Property, or part of it, as part of its Serviced Accommodation business.</p>
  <p><strong>1.5</strong> This Agreement grants a tenancy of the Property to the Tenant, a company. It is not, and is not intended to be, an assured tenancy or assured shorthold tenancy under the Housing Act 1988, because the Tenant is a company and not an individual. See clause 17.</p>

  <h2>2. The Property</h2>
  <p><strong>2.1</strong> The Landlord lets the Property to the Tenant [together with the right to use, in common with others entitled to the same right: insert any shared areas, parking, or storage].</p>
  <p><strong>2.2</strong> The Property is let furnished, in the condition recorded in the inventory and schedule of condition prepared and agreed by both parties before the Tenant takes occupation (Schedule 2).</p>

  <h2>3. Term</h2>
  <p><strong>3.1</strong> The Term is 24 months, starting on [insert start date] and ending on [insert end date], unless ended earlier under this Agreement.</p>
  <p><strong>3.2</strong> If the Tenant remains in occupation with the Landlord's consent after the end of the Term, this will create a new periodic tenancy on the same terms (so far as applicable), unless the parties agree a new written agreement.</p>

  <h2>4. Rent</h2>
  <p><strong>4.1</strong> The Tenant shall pay the Landlord rent of £[•] per calendar month ("the Rent"), payable in advance on the [•] day of each month, by bank transfer to the account notified by the Landlord.</p>
  <p><strong>4.2</strong> The first payment, covering the period from the start of the Term to the day before the next Rent payment date, is due on the date this Agreement is signed.</p>
  <p><strong>4.3</strong> Time for payment of Rent is not of the essence, but persistent late payment may be treated as a breach under clause 15.</p>

  <h2>5. Deposit</h2>
  <p><strong>5.1</strong> The Tenant shall pay the Landlord a deposit of £[•] (equivalent to two months' Rent) before the start of the Term, as security for the Tenant's obligations under this Agreement.</p>
  <p><strong>5.2</strong> Because this Agreement is not an assured shorthold tenancy, the statutory tenancy deposit protection scheme requirements under the Housing Act 2004 do not apply to this deposit. The deposit is instead held and dealt with strictly in accordance with this clause 5.</p>
  <p><strong>5.3</strong> The Landlord shall hold the deposit [as stakeholder / in a designated account] and, within 14 days of the end of the Term (once the Property has been inspected and any deductions agreed or determined), shall return the deposit to the Tenant, less any reasonable deductions for: unpaid Rent; the reasonable cost of remedying damage to the Property beyond fair wear and tear; the reasonable cost of replacing missing inventory items; and any other sums properly due from the Tenant under this Agreement.</p>
  <p><strong>5.4</strong> The Landlord shall provide the Tenant with a written explanation and supporting evidence (such as invoices or quotes) for any proposed deduction from the deposit.</p>

  <h2>6. Permitted Use — Serviced Accommodation</h2>
  <p><strong>6.1</strong> The Property may be used for residential purposes only, including specifically the Tenant's business of letting or licensing the Property (or rooms within it) to Guests on a short-term basis as Serviced Accommodation.</p>
  <p><strong>6.2</strong> The Tenant shall ensure that: (a) no single Guest, or group of connected Guests, occupies the Property (or any part of it) for a continuous period exceeding 90 nights, except with the Landlord's prior written consent; and (b) each Guest's occupation is genuinely short-term and holiday or business-visitor in character, and does not create, or purport to create, a tenancy or other right of long-term exclusive occupation in favour of the Guest.</p>
  <p><strong>6.3</strong> The Tenant shall not use, or permit the Property to be used for, any illegal or immoral purpose, or in a way that causes a nuisance or annoyance to neighbouring occupiers.</p>
  <p><strong>6.4</strong> The Tenant is responsible, at its own cost, for obtaining and maintaining any planning permission, licence, registration, or other consent required for its Serviced Accommodation use of the Property, including compliance with any applicable local short-term letting registration scheme, Article 4 direction, or restriction on the number of nights the Property may be let, and for complying with fire safety and other health and safety obligations relevant to accommodating paying Guests.</p>

  <h2>7. Tenant's Obligations</h2>
  <ul>
    <li>pay the Rent and any other sums due under this Agreement on time;</li>
    <li>keep the interior of the Property, and its fixtures, fittings, and furniture, in good and clean condition, fair wear and tear excepted;</li>
    <li>not make any structural alteration to the Property without the Landlord's prior written consent;</li>
    <li>not assign, sub-let, charge, or part with possession of the Property as a whole, other than granting short-term Guest occupation permitted under clause 6;</li>
    <li>report any disrepair or damage to the Landlord promptly;</li>
    <li>comply with all applicable laws in operating its Serviced Accommodation business from the Property;</li>
    <li>maintain the insurance required under clause 10; and</li>
    <li>yield up the Property at the end of the Term in accordance with clause 16.</li>
  </ul>

  <h2>8. Landlord's Obligations</h2>
  <ul>
    <li>allow the Tenant quiet enjoyment of the Property without interruption from the Landlord, subject to the Landlord's rights under this Agreement;</li>
    <li>comply with the Landlord's repairing obligations under clause 9;</li>
    <li>ensure the Property has a valid Energy Performance Certificate and, where applicable, a current gas safety record and electrical installation condition report, and provide copies to the Tenant; and</li>
    <li>confirm, before the start of the Term, that the Landlord's mortgage lender (if any) and buildings insurer have been informed of, and do not object to, the Property being let to a company for Serviced Accommodation use (see clause 10).</li>
  </ul>

  <h2>9. Repairs and Maintenance</h2>
  <p><strong>9.1</strong> The Landlord shall keep in repair the structure and exterior of the Property, and the installations for the supply of water, gas, electricity, sanitation, heating, and hot water, in accordance with (and without limiting) any obligations implied by section 11 of the Landlord and Tenant Act 1985.</p>
  <p><strong>9.2</strong> The Tenant shall keep the interior of the Property, and all fixtures, fittings, and contents provided by the Landlord, in good repair and condition, fair wear and tear excepted, and is responsible for routine maintenance and minor repairs arising from its use of the Property, including from Guest occupation.</p>
  <p><strong>9.3</strong> The Tenant shall notify the Landlord promptly of any disrepair which is the Landlord's responsibility under clause 9.1.</p>

  <h2>10. Insurance</h2>
  <p><strong>10.1</strong> The Landlord shall maintain buildings insurance for the Property and shall ensure the insurer is informed that the Property is let to a company for Serviced Accommodation / short-term guest use.</p>
  <p><strong>10.2</strong> The Tenant shall maintain appropriate insurance for its business operating from the Property, including public liability insurance and contents insurance for its own furniture, fixtures, and equipment, and shall provide evidence of this to the Landlord on request.</p>

  <h2>11. Alterations and Fixtures</h2>
  <p><strong>11.1</strong> The Tenant shall not make any alteration or addition to the Property without the Landlord's prior written consent, which will not be unreasonably withheld for non-structural changes reasonably required for the Tenant's Serviced Accommodation business (such as smart locks, key-safes, or additional smoke or heat alarms).</p>
  <p><strong>11.2</strong> Any fixtures installed by the Tenant may be removed by the Tenant at the end of the Term, provided the Tenant makes good any damage caused by their removal.</p>

  <h2>12. Guest Occupation</h2>
  <p><strong>12.1</strong> The Tenant may grant short-term licences to Guests to occupy the Property, or rooms within it, as part of its Serviced Accommodation business, subject to clause 6.</p>
  <p><strong>12.2</strong> The Tenant remains fully responsible to the Landlord for the Property and for the acts and omissions of its Guests as if they were the Tenant's own.</p>
  <p><strong>12.3</strong> Other than Guest occupation permitted under this clause, the Tenant shall not assign, sub-let, or part with possession of the Property without the Landlord's prior written consent.</p>

  <h2>13. Utilities, Council Tax, and Business Rates</h2>
  <p><strong>13.1</strong> The Tenant shall pay for all gas, electricity, water, telecommunications, and other utility charges, and any council tax or business rates, arising in respect of the Property during the Term.</p>
  <p><strong>13.2</strong> The Tenant acknowledges that operating Serviced Accommodation from the Property may result in the Property being assessed for business rates rather than council tax, and is responsible for making any necessary notification to the Valuation Office Agency or local authority.</p>

  <h2>14. Right of Entry and Inspection</h2>
  <p>The Landlord may, on giving the Tenant at least 48 hours' written notice (except in a genuine emergency), enter the Property at reasonable times to inspect its condition, carry out repairs, or (in the last 2 months of the Term) show the Property to prospective tenants, buyers, or lenders.</p>

  <h2>15. Break Clause and Early Termination</h2>
  <p><strong>15.1</strong> Either party may end this Agreement early by giving the other at least 2 months' written notice, such notice not to expire before the end of month 12 of the Term.</p>
  <p><strong>15.2</strong> The Landlord may also end this Agreement immediately by written notice if the Tenant: fails to pay Rent that is more than 14 days overdue and does not remedy this within 7 days of a written reminder; commits a material breach of this Agreement which is not remedied within 14 days of written notice to do so; or becomes insolvent or ceases to trade.</p>

  <h2>16. End of Term</h2>
  <p><strong>16.1</strong> At the end of the Term, however it ends, the Tenant shall: vacate the Property and return it to the Landlord with vacant possession; remove its own belongings and trade fixtures; and leave the Property clean and in the condition required by clause 7, fair wear and tear excepted.</p>
  <p><strong>16.2</strong> The Tenant shall ensure that no Guest remains in occupation of the Property beyond the end of the Term.</p>

  <h2>17. Status of This Agreement</h2>
  <p><strong>17.1</strong> The parties agree and confirm that this Agreement is a tenancy granted to the Tenant as a company, for the Tenant's business purposes (including operating Serviced Accommodation), and is not intended to be, and is not, an assured tenancy or assured shorthold tenancy under the Housing Act 1988, nor a tenancy to which the Renters' Rights Act 2025 applies.</p>
  <p><strong>17.2</strong> This clause reflects the genuine commercial arrangement between the parties. This Agreement is entered into for the Tenant's business of providing short-term Serviced Accommodation to Guests, and not as a means of housing any individual as their long-term home, and is not intended to deprive any individual of statutory tenant protections to which they would otherwise be entitled.</p>

  <h2>18. Notices</h2>
  <p>Any notice under this Agreement must be in writing and may be delivered by hand, sent by pre-paid post, or sent by email, to the addresses set out at the start of this Agreement (or as updated by written notice to the other party).</p>

  <h2>19. General</h2>
  <p><strong>19.1</strong> Entire Agreement: This Agreement, together with its Schedules, contains the entire agreement between the parties regarding the Property and supersedes all prior discussions or representations.</p>
  <p><strong>19.2</strong> No Wider Implied Terms: Except as required by law (including section 11 of the Landlord and Tenant Act 1985), no further repairing or similar obligation is implied into this Agreement.</p>
  <p><strong>19.3</strong> Severability: If any provision of this Agreement is found unenforceable, the remaining provisions continue in full force and effect.</p>
  <p><strong>19.4</strong> Third Party Rights: A person who is not a party to this Agreement has no right to enforce any of its terms under the Contracts (Rights of Third Parties) Act 1999.</p>

  <h2>20. Governing Law and Jurisdiction</h2>
  <p>This Agreement is governed by the laws of England and Wales, and the courts of England and Wales have exclusive jurisdiction over any dispute arising from it.</p>

  <h2>Signatures</h2>
  <p class="fp-sig"><strong>Signed by the Landlord:</strong></p>
  <p>Signature: __________________________</p>
  <p>Name: _____________________________</p>
  <p>Date: ______________________________</p>
  <p class="fp-note">(If the Landlord is also a company, execute in the same way as set out below for the Tenant.)</p>

  <p class="fp-sig"><strong>Signed for and on behalf of the Tenant, a company registered in England and Wales:</strong></p>
  <p>Signature: __________________________</p>
  <p>Name: _____________________________</p>
  <p>Position: Director</p>
  <p>Date: ______________________________</p>
  <p>Signature: __________________________</p>
  <p>Name: _____________________________</p>
  <p>Position: Director / Company Secretary</p>
  <p>Date: ______________________________</p>
  <p class="fp-note">(Two authorised signatories in accordance with section 44 of the Companies Act 2006. Alternatively, one director may sign in the presence of a witness who attests the signature below.)</p>
  <p>Witness signature: __________________________&nbsp;&nbsp;&nbsp;Name: _____________________&nbsp;&nbsp;&nbsp;Address: _____________________</p>
`;

// ---------------------------------------------------------------------------
// 2. Guest Utilities Disclaimer
// ---------------------------------------------------------------------------
const GUEST_UTILITIES_BODY = `
  <h1>Third-Party Utilities and Services Notice</h1>
  <p class="fp-subtitle">[Property name / address]</p>
  <p>This notice explains our position on interruptions to internet, electricity, water, gas, and heating during your stay. Please read it alongside the Guest Agreement and House Rules.</p>

  <h2>1. These Services Are Provided by Third Parties</h2>
  <p>Internet, electricity, water, gas, and heating at the property are supplied by third-party utility and telecommunications providers. These services, and the wider infrastructure they depend on, are outside our direct control.</p>

  <h2>2. We Can't Guarantee Uninterrupted Supply</h2>
  <p>We take reasonable care to make sure these services are working before your stay, but we can't guarantee they will run fault-free or uninterrupted throughout it, since this depends on third-party providers, local infrastructure, and matters outside our control — including network outages, planned or unplanned maintenance, and severe weather.</p>

  <h2>3. Minor or Temporary Interruptions</h2>
  <p>We are not responsible for short-term or minor interruptions to internet, electricity, water, gas, or heating that are caused by a third-party provider and outside our control, and an interruption like this does not, by itself, entitle you to a refund, discount, or cancellation of your stay.</p>

  <h2>4. What We'll Do If Something Goes Wrong</h2>
  <p>If you report an interruption to us, we will:</p>
  <ul>
    <li>respond promptly and try to identify the cause;</li>
    <li>report the fault to the relevant provider as soon as reasonably possible; and</li>
    <li>take reasonable steps to reduce any inconvenience to you while it's resolved (for example, providing information on the expected timeframe, or a reasonable alternative where one is genuinely available).</li>
  </ul>

  <h2>5. Your Statutory Rights Are Not Affected</h2>
  <p>This notice does not remove or reduce your legal rights, including your right to expect your accommodation to be provided with reasonable care and skill. If an interruption is severe and prolonged enough to make the property genuinely unfit to stay in — for example, a complete loss of water or heating lasting more than 24 hours with no reasonable alternative available — please contact us straight away so we can try to put things right, and you may still have a right to a remedy in those circumstances.</p>

  <h2>6. How to Report an Issue</h2>
  <p>If you experience any interruption to utilities or services during your stay, please contact us as soon as possible at [insert contact details, e.g. phone number / messaging channel], so we can help resolve it quickly.</p>

  <h2>Guest acknowledgement</h2>
  <p>I have read and understood this notice.</p>
  <p>Name: _____________________________</p>
  <p>Signature: __________________________</p>
  <p>Date: ______________________________</p>
`;

// ---------------------------------------------------------------------------
// 3. Non-Circumvention and Non-Competition Agreement
// ---------------------------------------------------------------------------
const NON_CIRC_BODY = `
  <h1>Non-Circumvention and Non-Competition Agreement</h1>
  <p class="fp-subtitle">(Property Sourcing — Rent-to-Rent / Serviced Accommodation)</p>
  <p class="fp-dated">Dated: [insert date]</p>

  <h2>Parties</h2>
  <p>(1) [Sourcer name / company name], of [Sourcer address] ("the Sourcer"); and</p>
  <p>(2) [Client name / company name], of [Client address] ("the Client"), together "the Parties".</p>

  <h2>Background</h2>
  <p>The Sourcer will introduce the Client to specific rent-to-rent or serviced accommodation opportunities, including landlords and properties identified by the Sourcer. Because the value the Sourcer provides lies in these specific introductions, this Agreement protects the Sourcer against the Client using an introduction to deal directly with the introduced landlord or property owner while avoiding the Sourcer's fee. This Agreement is deliberately narrow: it does not, and is not intended to, prevent the Client from sourcing or operating serviced accommodation opportunities generally, using its own contacts or effort.</p>

  <h2>1. Definitions</h2>
  <p><strong>1.1</strong> "Introduced Contact" means any landlord, property owner, letting agent, or property specifically introduced or identified to the Client by the Sourcer.</p>
  <p><strong>1.2</strong> "Restricted Period" means 24 months from the date the relevant Introduced Contact was first introduced to the Client.</p>
  <p><strong>1.3</strong> "Sourcing Fee" means the fee that would have been payable to the Sourcer under the Sourcing Agreement (or, if none is in place, £[•]) had the Client engaged the Sourcer to complete the introduction in the usual way.</p>

  <h2>2. Non-Circumvention</h2>
  <p><strong>2.1</strong> During the Restricted Period for a given Introduced Contact, the Client shall not, directly or indirectly (including through any connected person, company, or associate), negotiate, contract, or enter into any tenancy, licence, management agreement, purchase, or other arrangement with that Introduced Contact, other than through the Sourcer, without the Sourcer's prior written consent.</p>
  <p><strong>2.2</strong> If the Client (or a connected person or company) enters into an arrangement with an Introduced Contact in breach of clause 2.1, the Client shall pay the Sourcer the Sourcing Fee within 14 days of the Sourcer's written request. This reflects the value of the introduction the Sourcer has already provided, and is not a penalty for breach.</p>
  <p><strong>2.3</strong> Clause 2.1 does not apply where the Client already had a genuine, independent prior relationship with the Introduced Contact before the Sourcer's introduction, and can reasonably evidence this.</p>

  <h2>3. Limited Non-Competition</h2>
  <p><strong>3.1</strong> For 12 months from the date of this Agreement, the Client shall not use the Sourcer's confidential sourcing methods, or the specific contacts or introductions disclosed by the Sourcer, to independently source further opportunities from the same Introduced Contact(s), other than through the Sourcer.</p>
  <p><strong>3.2</strong> For the avoidance of doubt, nothing in this Agreement restricts the Client's general freedom to source, invest in, or operate rent-to-rent or serviced accommodation businesses using its own contacts, efforts, or introductions unconnected with the Sourcer, whether during or after the Restricted Period.</p>

  <h2>4. Reasonableness</h2>
  <p>Each Party confirms it considers the restrictions in this Agreement to be reasonable and no wider than necessary to protect the Sourcer's legitimate interest in the introductions it makes, having had the opportunity to take independent advice before signing.</p>

  <h2>5. Remedies</h2>
  <p>Each Party acknowledges that a breach of clause 2 or clause 3 may cause the Sourcer harm that could not be adequately remedied by damages alone, and that the Sourcer may accordingly seek an injunction or other equitable relief, in addition to the fee payable under clause 2.2 and any other remedy available to it.</p>

  <h2>6. General</h2>
  <p><strong>6.1</strong> Relationship to Other Agreements: This Agreement sits alongside, and does not replace, any Non-Disclosure Agreement or Sourcing Agreement between the Parties. If there is a conflict between this Agreement and a Sourcing Agreement regarding non-circumvention, this Agreement takes priority.</p>
  <p><strong>6.2</strong> Severability: If any provision of this Agreement, including the scope or duration of a restriction, is found to go further than necessary to protect the Sourcer's legitimate interest, it shall be read down to the minimum extent needed to make it enforceable, rather than the whole provision being void.</p>
  <p><strong>6.3</strong> Assignment: Neither Party may assign or transfer its rights under this Agreement without the other Party's prior written consent.</p>
  <p><strong>6.4</strong> Governing Law and Jurisdiction: This Agreement is governed by the laws of England and Wales, and the courts of England and Wales have exclusive jurisdiction over any dispute arising from it.</p>

  <p class="fp-sig"><strong>Signed by or on behalf of the Sourcer:</strong></p>
  <p>Signature: __________________________</p>
  <p>Name: _____________________________</p>
  <p>Date: ______________________________</p>

  <p class="fp-sig"><strong>Signed by or on behalf of the Client:</strong></p>
  <p>Signature: __________________________</p>
  <p>Name: _____________________________</p>
  <p>Date: ______________________________</p>
  <p class="fp-note">(Where either Party is a company, this Agreement should be executed by two authorised signatories, or by one director in the presence of a witness, in accordance with section 44 of the Companies Act 2006.)</p>
`;

// ---------------------------------------------------------------------------
// 5. Non-Disclosure Agreement (SA Sourcing)
// ---------------------------------------------------------------------------
const NDA_BODY = `
  <h1>Non-Disclosure Agreement</h1>
  <p class="fp-subtitle">(Property Sourcing — Rent-to-Rent / Serviced Accommodation)</p>
  <p class="fp-dated">Dated: [insert date]</p>

  <h2>Parties</h2>
  <p>(1) [Sourcer name / company name], of [Sourcer address] ("the Sourcer"); and</p>
  <p>(2) [Client name / company name], of [Client address] ("the Client"), together "the Parties".</p>

  <h2>Background</h2>
  <p>The Sourcer identifies and negotiates rent-to-rent and serviced accommodation opportunities, and wishes to share details of specific properties, landlords, and deal terms 
  with the Client for the purpose of the Client considering whether to take on such an opportunity. In the course of their discussions, each Party may disclose confidential 
  information to the other. This Agreement sets out how that information must be protected.</p>

  <h2>1. Definitions</h2>
  <p><strong>1.1</strong> "Confidential Information" means any information disclosed by one Party ("the Discloser") to the other ("the Recipient"), in any form, that is marked 
  or reasonably understood to be confidential, including in particular: (a) details of any specific property, landlord, or letting opportunity introduced by the Sourcer 
  ("Property Information"), including addresses, landlord contact details, and negotiated or proposed terms; (b) the Sourcer's sourcing methods, contacts, and business processes; 
  and (c) the Client's investment criteria, financial position, and business plans.</p>
  <p><strong>1.2</strong> Confidential Information does not include information that: is or becomes public knowledge other than through the Recipient's breach of this Agreement; was
   already known to the Recipient without an obligation of confidence; is independently developed by the Recipient without use of the Discloser's Confidential Information; or is 
   required to be disclosed by law, regulation, or a competent authority.</p>

  <h2>2. Confidentiality Obligations</h2>
  <p><strong>2.1</strong> Each Party shall keep the other's Confidential Information confidential and shall not disclose it to any third party without the Discloser's prior 
  written consent, except as permitted under clause 2.3.</p>
  <p><strong>2.2</strong> Each Party shall use the other's Confidential Information only for the purpose of evaluating and, if applicable, pursuing the specific opportunity
   in connection with which it was disclosed, and not for any other purpose, including circumventing the Sourcer (see the separate Non-Circumvention and Non-Competition 
   Agreement between the Parties, where one is in place).</p>
  <p><strong>2.3</strong> A Party may disclose the other's Confidential Information to its own professional advisers (such as solicitors, accountants, or brokers) who 
  need to know it for the purpose in clause 2.2, provided those advisers are bound by an equivalent duty of confidentiality.</p>
  <p><strong>2.4</strong> Each Party shall restrict access to the other's Confidential Information to those of its own personnel who genuinely need it, and shall 
  take reasonable care to prevent its accidental disclosure or loss.</p>

  <h2>3. No Licence, No Obligation to Proceed</h2>
  <p><strong>3.1</strong> Disclosure of Confidential Information does not grant the Recipient any licence or right in respect of it, beyond the limited purpose 
  set out in clause 2.2.</p>
  <p><strong>3.2</strong> Nothing in this Agreement obliges either Party to enter into any further agreement, or to proceed with any opportunity discussed.</p>

  <h2>4. No Warranty</h2>
  <p>Property Information and other Confidential Information is provided for general consideration only. The Sourcer does not warrant the accuracy, completeness, 
  or currency of any Property Information, and the Client remains responsible for carrying out its own due diligence before proceeding with any opportunity.</p>

  <h2>5. Duration</h2>
  <p>The obligations in this Agreement apply from the date of this Agreement and continue for 2 years after the date on which the relevant Confidential Information 
  was disclosed, or until it ceases to be confidential under clause 1.2, if earlier.</p>

  <h2>6. Return or Destruction of Information</h2>
  <p>On the Discloser's written request, the Recipient shall promptly return or securely destroy all materials containing the Discloser's Confidential Information 
  in its possession or control, except to the extent it is required to retain copies by law or its own record-keeping obligations.</p>

  <h2>7. Remedies</h2>
  <p>Each Party acknowledges that a breach of this Agreement may cause the other Party harm that could not be adequately remedied by damages alone, and that the 
  non-breaching Party may accordingly seek an injunction or other equitable relief, in addition to any other remedy available to it.</p>

  <h2>8. General</h2>
  <p><strong>8.1</strong> Entire Agreement: This Agreement constitutes the entire agreement between the Parties regarding the confidentiality of the information 
  described in it, and supersedes any prior discussions on that subject.</p>
  <p><strong>8.2</strong> No Partnership: Nothing in this Agreement creates a partnership, joint venture, or agency between the Parties.</p>
  <p><strong>8.3</strong> Assignment: Neither Party may assign or transfer its rights under this Agreement without the other Party's prior written consent.</p>
  <p><strong>8.4</strong> Severability: If any provision of this Agreement is found unenforceable, the remaining provisions continue in full force and effect.</p>
  <p><strong>8.5</strong> Governing Law and Jurisdiction: This Agreement is governed by the laws of England and Wales, and the courts of England and Wales have 
  exclusive jurisdiction over any dispute arising from it.</p>

  <p class="fp-sig"><strong>Signed by or on behalf of the Sourcer:</strong></p>
  <p>Signature: __________________________</p>
  <p>Name: _____________________________</p>
  <p>Date: ______________________________</p>

  <p class="fp-sig"><strong>Signed by or on behalf of the Client:</strong></p>
  <p>Signature: __________________________</p>
  <p>Name: _____________________________</p>
  <p>Date: ______________________________</p>
  <p class="fp-note">(Where either Party is a company, this Agreement should be executed by two authorised signatories, or by one director in the presence of 
  a witness, in accordance with section 44 of the Companies Act 2006.)</p>
`;

// ---------------------------------------------------------------------------
// 6. Guest Agreement and House Rules
// ---------------------------------------------------------------------------
const GUEST_HOUSE_RULES_BODY = `
  <h1>Guest Agreement and House Rules</h1>
  <p class="fp-subtitle">[Property name / address]</p>
  <p>Please read and sign this before your stay. It sets out the house rules for [the Property] and a few practical terms about your booking. It doesn't replace or reduce any rights you have under the platform you booked through, or under UK consumer law.</p>

  <h2>1. Your Stay</h2>
  <p>This Agreement is between [Host / Operator name] ("the Host", "we") and [Guest name] ("you", "the Guest"), for your stay at [the Property] from [check-in date] to [check-out date]. Only the number of guests stated in your booking ("the Party") may stay overnight, unless you've agreed otherwise with us in advance.</p>

  <h2>2. House Rules</h2>
  <p>To keep the property in good condition and to be considerate of neighbours, please follow these rules during your stay:</p>
  <ul>
    <li>Quiet hours: please keep noise to a minimum between 10pm and 8am, and be considerate of neighbours at all other times.</li>
    <li>No smoking or vaping inside the property. [Smoking is permitted only in: insert designated outdoor area, if applicable.]</li>
    <li>No parties or events of any kind.</li>
    <li>No loud music or amplified sound, at any time, that could disturb neighbours.</li>
    <li>No pets, unless agreed with us in advance in writing.</li>
    <li>No illegal drugs or unlawful activity of any kind on the property.</li>
    <li>Please don't exceed the number of overnight guests stated in your booking.</li>
    <li>Smoke alarms, carbon monoxide alarms, and other safety equipment must not be covered, disabled, or tampered with.</li>
    <li>Please lock doors and windows whenever the property is left unoccupied, and take reasonable care of any keys, fobs, or access codes provided.</li>
    <li>Please let us know as soon as possible about any damage, breakage, or fault you notice or cause.</li>
    <li>The property must not be used for any commercial purpose, or for filming or photography intended for publication, without our prior written consent.</li>
    <li>[If applicable] This property has external security camera(s)/video doorbell(s) covering [insert location, e.g. the front entrance] only. There are no cameras inside the property or covering any private space.</li>
  </ul>
  <p>You're responsible for making sure anyone you invite to the property, or anyone in your Party, also follows these rules.</p>

  <h2>3. Check-In and Check-Out</h2>
  <p>Check-in is from [3:00pm] and check-out is by [10:00am], unless we've agreed a different time with you in writing. If you check out late without our agreement, a late check-out charge of £30 per hour (or part hour) will apply, after a grace period of 30 minutes.</p>

  <h2>4. Security Deposit</h2>
  <p>A refundable security deposit of £[•] is required before/at check-in, [by pre-authorisation on your card / by bank transfer]. We will return your deposit within [5] days of check-out, once the property has been checked.</p>
  <p>We may deduct from the deposit the reasonable, documented cost of: repairing damage beyond fair wear and tear; replacing missing items; extra cleaning genuinely needed because of the state the property was left in (for example, due to smoking indoors); any late check-out charge under clause 3; or other reasonable loss or cost we can show was directly caused by a breach of these House Rules (for example, a fine or compensation we have to pay because of an unauthorised party). We will explain any deduction and provide evidence (such as an invoice or photos) if asked. Anything not needed to cover a genuine cost like this will be returned to you.</p>

  <h2>5. Serious Breaches</h2>
  <p>If there is a serious breach of these House Rules during your stay — for example, an unauthorised party, illegal activity, or behaviour that puts people or the property at serious risk — we may end your stay early. In that situation, we won't refund the remaining nights of your booking, but this does not apply to ordinary, minor issues, and we'll always try to raise a concern with you directly first if it's practical to do so.</p>

  <h2>6. Your Rights Are Not Affected</h2>
  <p>Nothing in this Agreement removes or reduces any right you have under UK consumer law, or under the terms of the platform you booked through. If anything in this Agreement conflicts with those rights, your statutory rights take priority.</p>

  <h2>7. General</h2>
  <p>This Agreement is governed by the laws of England and Wales. If you have any questions before you arrive, please contact us at [insert contact details].</p>

  <h2>Guest acknowledgement</h2>
  <p>I have read and agree to this Guest Agreement and House Rules for my stay.</p>
  <p>Name: _____________________________</p>
  <p>Signature: __________________________</p>
  <p>Date: ______________________________</p>
`;

// ---------------------------------------------------------------------------
// 7. Sourcing Agreement (R2R / R2SA)
// ---------------------------------------------------------------------------
const SOURCING_BODY = `
  <h1>Sourcing Agreement</h1>
  <p class="fp-subtitle">(Rent-to-Rent / Rent-to-Serviced-Accommodation Sourcing)</p>
  <p class="fp-dated">Dated: [insert date]</p>

  <h2>Parties</h2>
  <p>(1) [Sourcer name / company name], of [Sourcer address] ("the Sourcer"); and</p>
  <p>(2) [Client name / company name], of [Client address] ("the Client"), together "the Parties".</p>

  <h2>Background</h2>
  <p>The Client wishes to acquire one or more rent-to-rent or rent-to-serviced-accommodation opportunities matching the criteria in Schedule 1 ("the Criteria"). The Sourcer carries on a business of identifying, negotiating, and introducing such opportunities to clients. The Sourcer agrees to search for and introduce suitable opportunities to the Client on the terms of this Agreement.</p>

  <h2>1. Definitions</h2>
  <p><strong>1.1</strong> "Opportunity" means a property, and an associated landlord or property owner willing in principle to let it on a rent-to-rent or company-let basis, identified by the Sourcer and introduced to the Client.</p>
  <p><strong>1.2</strong> "Introduction" means the Sourcer providing the Client with the address, landlord contact details, and headline terms of an Opportunity.</p>
  <p><strong>1.3</strong> "Completion" means the Client (or a connected person or company) entering into a tenancy, company let, management agreement, or other binding arrangement in respect of an Opportunity.</p>
  <p><strong>1.4</strong> "Sourcing Fee" means the fee set out in clause 4.</p>

  <h2>2. The Sourcer's Services</h2>
  <p><strong>2.1</strong> The Sourcer shall use reasonable endeavours to identify Opportunities matching the Criteria and to introduce them to the Client.</p>
  <p><strong>2.2</strong> The Sourcer shall provide reasonable assistance with initial discussions with the landlord of an introduced Opportunity, including relaying headline terms, but the Client remains responsible for negotiating and agreeing the final terms of any arrangement directly with the landlord (or through its own advisers).</p>
  <p><strong>2.3</strong> This Agreement does not oblige the Sourcer to find any minimum number of Opportunities, or any Opportunity at all, within any particular timeframe.</p>

  <h2>3. No Guarantee — Client's Own Due Diligence</h2>
  <p><strong>3.1</strong> The Sourcer does not guarantee that any Opportunity will be profitable, suitable for the Client's purposes, or free of legal, structural, planning, or licensing issues.</p>
  <p><strong>3.2</strong> Before proceeding to Completion on any Opportunity, the Client is responsible for carrying out its own due diligence, including verifying the landlord's title and authority to let, planning and licensing requirements (including any Article 4 direction or local short-term letting registration scheme), the condition of the property, and the commercial terms, and is encouraged to take independent legal and financial advice.</p>

  <h2>4. Sourcing Fee</h2>
  <p><strong>4.1</strong> On Completion of an arrangement in respect of an Opportunity, the Client shall pay the Sourcer a Sourcing Fee of £[•] [or: [•]% of the first month's rent under the arrangement], within 14 days of Completion.</p>
  <p><strong>4.2</strong> The Sourcing Fee is payable in respect of each Opportunity that reaches Completion, whether or not the Client used the Sourcer's assistance to negotiate the final terms.</p>
  <p><strong>4.3</strong> Where the Client (or a connected person or company) reaches Completion with the landlord of an introduced Opportunity other than through the Sourcer, the non-circumvention position set out in clause 7 applies instead of this clause 4.</p>

  <h2>5. Client's Obligations</h2>
  <ul>
    <li>provide the Sourcer with accurate information about its requirements, budget, and financial position, so the Sourcer can identify suitable Opportunities;</li>
    <li>respond to Introductions within a reasonable time so the Sourcer can manage its relationship with landlords;</li>
    <li>carry out its own due diligence in accordance with clause 3.2 before proceeding to Completion; and</li>
    <li>pay the Sourcing Fee when due under clause 4.</li>
  </ul>

  <h2>6. Confidentiality</h2>
  <p>Each Party shall keep confidential any Property Information, business methods, or other confidential information disclosed by the other in connection with this Agreement, and shall use it only to evaluate and, if applicable, pursue an Opportunity. This clause applies whether or not the Parties have also signed a separate Non-Disclosure Agreement, and does not limit the terms of one if they have.</p>

  <h2>7. Non-Circumvention</h2>
  <p><strong>7.1</strong> For 24 months from an Introduction, the Client shall not, directly or indirectly (including through a connected person or company), reach Completion with the landlord of that Opportunity other than through the Sourcer, without the Sourcer's prior written consent.</p>
  <p><strong>7.2</strong> If the Client breaches clause 7.1, the Client shall pay the Sourcer the Sourcing Fee that would otherwise have been due under clause 4, within 14 days of the Sourcer's written request. This reflects the value of the Introduction already provided, and is not a penalty for breach.</p>
  <p><strong>7.3</strong> This clause 7 sits alongside, and does not replace, any separate Non-Circumvention and Non-Competition Agreement between the Parties. Nothing in this Agreement restricts the Client's general freedom to source or operate rent-to-rent or serviced accommodation opportunities using its own contacts, unconnected with the Sourcer.</p>

  <h2>8. Regulatory Compliance</h2>
  <p><strong>8.1</strong> The Sourcer confirms it will comply with any regulatory requirements applicable to its sourcing activities, including (where applicable to its business) registration with HMRC for anti-money laundering supervision and membership of a property redress scheme.</p>
  <p><strong>8.2</strong> The Client remains responsible for ensuring its own intended use of any Opportunity (including as Serviced Accommodation) complies with planning, licensing, mortgage or lease restrictions, and insurance requirements.</p>

  <h2>9. Limitation of Liability</h2>
  <p><strong>9.1</strong> Nothing in this Agreement excludes or limits either Party's liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or for any other liability which cannot lawfully be excluded or limited.</p>
  <p><strong>9.2</strong> Subject to clause 9.1, the Sourcer's total liability to the Client arising out of or in connection with this Agreement shall not exceed the total Sourcing Fees paid by the Client in the 12 months before the claim arose, and the Sourcer shall not be liable for the landlord's conduct, the condition of any property, or the profitability of any Opportunity.</p>

  <h2>10. Term and Termination</h2>
  <p><strong>10.1</strong> This Agreement continues until terminated by either Party giving the other 30 days' written notice, or immediately by either Party for the other's material breach not remedied within 14 days of written notice to do so.</p>
  <p><strong>10.2</strong> Termination does not affect any Sourcing Fee already due, or the operation of clause 7 (Non-Circumvention) in respect of Opportunities introduced before termination.</p>

  <h2>11. General</h2>
  <p><strong>11.1</strong> Entire Agreement: This Agreement, together with its Schedule and any separate Non-Disclosure or Non-Circumvention and Non-Competition Agreement between the Parties, constitutes the entire agreement between them regarding the Sourcer's services.</p>
  <p><strong>11.2</strong> No Partnership: Nothing in this Agreement creates a partnership, joint venture, or agency between the Parties, and the Sourcer is not authorised to bind the Client to any agreement with a landlord.</p>
  <p><strong>11.3</strong> Assignment: Neither Party may assign or transfer its rights under this Agreement without the other's prior written consent.</p>
  <p><strong>11.4</strong> Severability: If any provision of this Agreement is found unenforceable, the remaining provisions continue in full force and effect.</p>
  <p><strong>11.5</strong> Governing Law and Jurisdiction: This Agreement is governed by the laws of England and Wales, and the courts of England and Wales have exclusive jurisdiction over any dispute arising from it.</p>

  <p class="fp-sig"><strong>Signed by or on behalf of the Sourcer:</strong></p>
  <p>Signature: __________________________</p>
  <p>Name: _____________________________</p>
  <p>Date: ______________________________</p>

  <p class="fp-sig"><strong>Signed by or on behalf of the Client:</strong></p>
  <p>Signature: __________________________</p>
  <p>Name: _____________________________</p>
  <p>Date: ______________________________</p>
  <p class="fp-note">(Where either Party is a company, this Agreement should be executed by two authorised signatories, or by one director in the presence of a witness, in accordance with section 44 of the Companies Act 2006.)</p>

  <h2>Schedule 1 — The Client's Criteria</h2>
  <table>
    <thead>
      <tr><th>Criterion</th><th>Details</th></tr>
    </thead>
    <tbody>
      <tr><td>Property type</td><td>[e.g. 2-4 bedroom houses, flats]</td></tr>
      <tr><td>Location(s)</td><td>[insert target areas]</td></tr>
      <tr><td>Rent budget</td><td>[insert monthly rent range]</td></tr>
      <tr><td>Minimum term sought</td><td>[insert]</td></tr>
      <tr><td>Other requirements</td><td>[e.g. landlord willing to permit Serviced Accommodation use]</td></tr>
    </tbody>
  </table>
`;

// ---------------------------------------------------------------------------
// 8. Serviced Accommodation Management Agreement
// ---------------------------------------------------------------------------
const MANAGEMENT_BODY = `
  <h1>Serviced Accommodation Management Agreement</h1>
  <p class="fp-subtitle">(SA Operator Managing an Owner's Property)</p>
  <p class="fp-dated">Dated: [insert date]</p>

  <h2>Parties</h2>
  <p>(1) [Owner name / company name], of [Owner address] ("the Owner"); and</p>
  <p>(2) [Operator company name], a company registered in England and Wales under company number [•], whose registered office is at [Operator registered office address] ("the Operator"), together "the Parties".</p>

  <h2>Background</h2>
  <p>The Owner owns, or has the right to let, the property described in Schedule 1 ("the Property") and wishes to make it available as short-term Serviced Accommodation to paying guests. The Operator carries on a business of managing properties as Serviced Accommodation on behalf of owners. The Owner appoints the Operator to manage the Property on the terms of this Agreement.</p>

  <h2>1. Definitions</h2>
  <p><strong>1.1</strong> "Guest" means any individual who books or occupies the Property on a short-term basis through the Operator's management.</p>
  <p><strong>1.2</strong> "Booking Revenue" means all sums paid by or on behalf of Guests for their stay at the Property, before deduction of any fees, commission, or expenses.</p>
  <p><strong>1.3</strong> "Commission" means the Operator's fee, being [20]% of Booking Revenue, as set out in Schedule 2.</p>
  <p><strong>1.4</strong> "OTA" means an online travel agency or booking platform (such as Airbnb or Booking.com) used to list and take bookings for the Property.</p>
  <p><strong>1.5</strong> "Term" means the period set out in clause 11.</p>

  <h2>2. Appointment</h2>
  <p><strong>2.1</strong> The Owner appoints the Operator as its sole and exclusive agent to manage the Property as Serviced Accommodation for the Term, and the Operator accepts that appointment.</p>
  <p><strong>2.2</strong> During the Term, the Owner shall not itself, nor through any other agent, let or manage the Property as Serviced Accommodation, without the Operator's written consent.</p>

  <h2>3. The Operator's Services</h2>
  <p>The Operator shall, as part of its management of the Property:</p>
  <ul>
    <li>list and market the Property on one or more OTAs and other appropriate channels;</li>
    <li>manage guest enquiries, bookings, check-in and check-out arrangements, and day-to-day guest communication;</li>
    <li>set and adjust pricing to reflect demand and market conditions;</li>
    <li>arrange cleaning and turnover of the Property between Guest stays;</li>
    <li>arrange routine maintenance, and notify the Owner promptly of any repair beyond routine maintenance;</li>
    <li>collect and, where applicable, return any Guest damage deposit; and</li>
    <li>provide the Owner with a monthly statement of bookings, Booking Revenue, Commission, and expenses.</li>
  </ul>

  <h2>4. Payment of Booking Revenue and Commission</h2>
  <p>The Parties select one of the following options for how Booking Revenue is collected. Delete whichever Option does not apply before this Agreement is signed.</p>
  <p><strong>OPTION A — Operator Collects Booking Revenue</strong></p>
  <p><strong>4A.1</strong> All Booking Revenue is paid to, or collected by, the Operator, including through the Operator's own OTA accounts and payment processing.</p>
  <p><strong>4A.2</strong> Within 14 days of the end of each calendar month, the Operator shall remit to the Owner the Booking Revenue for that month, less the Commission and any pre-agreed expenses ("the Owner's Share"), together with a statement showing bookings, Booking Revenue, deductions, and the Owner's Share.</p>
  <p><strong>4A.3</strong> Because the Operator receives and holds money on behalf of the Owner under this Option, the Operator confirms that it is a member of a Client Money Protection scheme approved under the Client Money Protection Schemes (Requirement to Belong to a Scheme etc.) Regulations 2019, membership number [insert], and that Booking Revenue received on behalf of the Owner is held in a designated client account separate from the Operator's own funds.</p>
  <p><strong>OPTION B — Owner Collects Booking Revenue</strong></p>
  <p><strong>4B.1</strong> All Booking Revenue is paid to, or collected by, the Owner directly, including through the Owner's own OTA accounts and payment processing.</p>
  <p><strong>4B.2</strong> The Operator shall invoice the Owner monthly for its Commission, calculated on the Booking Revenue for that period, and the Owner shall pay each invoice within 14 days of receipt.</p>
  <p><strong>4B.3</strong> Because the Operator does not receive or hold Booking Revenue on the Owner's behalf under this Option, the Client Money Protection scheme requirement referred to in Option A does not apply to the Operator in respect of this Agreement.</p>

  <h2>5. OTA Listings and Data</h2>
  <p><strong>5.1</strong> Where the Property is listed under the Operator's own OTA accounts, the Operator shall, within 14 days of the end of the Term, provide the Owner with a reasonable export of the Property's booking history and any Guest reviews held in a portable format, and reasonable assistance in setting up a new listing if the Owner wishes to do so.</p>
  <p><strong>5.2</strong> The Owner acknowledges that Guest reviews, search ranking, and "superhost" or equivalent status are generally attached to the hosting account and platform, and may not be transferable to a new listing or account, regardless of the assistance provided under clause 5.1.</p>

  <h2>6. Owner's Obligations</h2>
  <ul>
    <li>ensure the Property is fit for purpose and lawfully able to be used as Serviced Accommodation, including that any mortgage lender's or head-landlord's consent has been obtained;</li>
    <li>maintain buildings insurance for the Property and ensure the insurer is informed that it is used as Serviced Accommodation;</li>
    <li>provide the Operator with keys, access codes, and information reasonably needed to manage the Property; and</li>
    <li>pay for major repairs and replacements outside the Operator's routine maintenance responsibility under clause 3, as agreed between the Parties.</li>
  </ul>

  <h2>7. Operator's Obligations</h2>
  <ul>
    <li>manage the Property with reasonable skill and care;</li>
    <li>comply with all applicable laws relevant to operating Serviced Accommodation from the Property, including fire safety, planning, and any local short-term letting registration scheme;</li>
    <li>maintain public liability insurance for its management activities, and provide evidence of this to the Owner on request;</li>
    <li>not permit any single Guest, or group of connected Guests, to occupy the Property for a continuous period exceeding 90 nights, without the Owner's prior written consent; and</li>
    <li>keep accurate records of bookings, Booking Revenue, and expenses, and make them available to the Owner on reasonable request.</li>
  </ul>

  <h2>8. Confidentiality and Non-Solicitation</h2>
  <p><strong>8.1</strong> Each Party shall keep confidential the other's business and financial information shared in connection with this Agreement, and use it only for the purposes of this Agreement.</p>
  <p><strong>8.2</strong> During the Term and for 12 months afterwards, the Owner shall not solicit or engage any cleaning, maintenance, or other supplier introduced to the Property by the Operator, without the Operator's consent. This does not restrict the Owner from managing the Property itself, or through another agent, using its own suppliers, after the Term ends.</p>

  <h2>9. Insurance</h2>
  <p>The Owner and the Operator shall each maintain the insurance described in clauses 6 and 7 throughout the Term, and shall notify the other promptly if either becomes aware that required cover has lapsed or is at risk.</p>

  <h2>10. Limitation of Liability</h2>
  <p><strong>10.1</strong> Nothing in this Agreement excludes or limits either Party's liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or for any other liability which cannot lawfully be excluded or limited.</p>
  <p><strong>10.2</strong> Subject to clause 10.1, the Operator's total liability to the Owner arising out of or in connection with this Agreement shall not exceed the total Commission earned by the Operator in the 12 months before the claim arose, and the Operator does not guarantee any particular level of occupancy, Booking Revenue, or profit, nor is it liable for the acts, omissions, or policies of any OTA.</p>

  <h2>11. Term and Termination</h2>
  <p><strong>11.1</strong> This Agreement begins on [insert start date] and continues for an initial term of 12 months, after which it continues unless and until either Party gives the other 60 days' written notice to terminate.</p>
  <p><strong>11.2</strong> Either Party may terminate this Agreement immediately by written notice if the other commits a material breach not remedied within 14 days of written notice to do so, or becomes insolvent.</p>
  <p><strong>11.3</strong> On termination, the Operator shall, within 14 days: provide a final statement and pay any Owner's Share or other sums due; hand over keys, access codes, and Guest booking details for any confirmed future bookings; and comply with clause 5 in respect of OTA data.</p>
  <p><strong>11.4</strong> Any confirmed Guest bookings due to take place after termination shall, so far as possible, be honoured or transferred in an orderly way, and the Parties shall cooperate in good faith to avoid disruption to Guests with existing bookings.</p>

  <h2>12. General</h2>
  <p><strong>12.1</strong> Entire Agreement: This Agreement, together with its Schedules, constitutes the entire agreement between the Parties regarding the management of the Property.</p>
  <p><strong>12.2</strong> No Partnership: Nothing in this Agreement creates a partnership, joint venture, or employment relationship between the Parties.</p>
  <p><strong>12.3</strong> Assignment: Neither Party may assign or transfer its rights under this Agreement without the other's prior written consent.</p>
  <p><strong>12.4</strong> Severability: If any provision of this Agreement is found unenforceable, the remaining provisions continue in full force and effect.</p>
  <p><strong>12.5</strong> Governing Law and Jurisdiction: This Agreement is governed by the laws of England and Wales, and the courts of England and Wales have exclusive jurisdiction over any dispute arising from it.</p>

  <p class="fp-sig"><strong>Signed by or on behalf of the Owner:</strong></p>
  <p>Signature: __________________________</p>
  <p>Name: _____________________________</p>
  <p>Date: ______________________________</p>

  <p class="fp-sig"><strong>Signed for and on behalf of the Operator, a company registered in England and Wales:</strong></p>
  <p>Signature: __________________________</p>
  <p>Name: _____________________________</p>
  <p>Position: Director</p>
  <p>Date: ______________________________</p>
  <p>Signature: __________________________</p>
  <p>Name: _____________________________</p>
  <p>Position: Director / Company Secretary</p>
  <p>Date: ______________________________</p>
  <p class="fp-note">(Two authorised signatories in accordance with section 44 of the Companies Act 2006. Alternatively, one director may sign in the presence of a witness who attests the signature.)</p>

  <h2>Schedule 1 — The Property</h2>
  <p>Address: [insert full postal address]</p>
  <p>Brief description: [insert — e.g. number of bedrooms/bathrooms, any parking, any shared areas]</p>

  <h2>Schedule 2 — Commission and Fees</h2>
  <p>Commission rate: [20]% of Booking Revenue</p>
  <p>Any additional fees (e.g. one-off setup/photography fee, out-of-pocket expenses): [insert]</p>
`;

// ---------------------------------------------------------------------------
// Exported templates
// ---------------------------------------------------------------------------
export const AGREEMENT_TEMPLATES: AgreementTemplateData[] = [
  {
    id: 'company-let-agreement-v2',
    name: 'Company Let Agreement – Serviced Accommodation (V2)',
    description: 'Tenancy agreement for letting a property to a company for Serviced Accommodation use.',
    type: 'document',
    sections: [],
    defaultQuestions: [],
    content: wrap(COMPANY_LET_BODY),
  },
  {
    id: 'company-let-agreement-v1',
    name: 'Company Let Agreement – Serviced Accommodation (V1)',
    description: 'Tenancy agreement for letting a property to a company for Serviced Accommodation use.',
    type: 'document',
    sections: [],
    defaultQuestions: [],
    content: wrap(COMPANY_LET_BODY),
  },
  {
    id: 'guest-utilities-disclaimer',
    name: 'Guest Utilities Disclaimer',
    description: 'Notice explaining how utility/service interruptions during a guest stay are handled.',
    type: 'document',
    sections: [],
    defaultQuestions: [],
    content: wrap(GUEST_UTILITIES_BODY),
  },
  {
    id: 'non-circumvention-non-competition',
    name: 'Non-Circumvention & Non-Competition Agreement',
    description: 'Protects a property sourcer against a client bypassing them on an introduced deal.',
    type: 'document',
    sections: [],
    defaultQuestions: [],
    content: wrap(NON_CIRC_BODY),
  },
  {
    id: 'nda-sa-sourcing',
    name: 'Non-Disclosure Agreement (SA Sourcing)',
    description: 'Confidentiality agreement between a property sourcer and client.',
    type: 'document',
    sections: [],
    defaultQuestions: [],
    content: wrap(NDA_BODY),
  },
  {
    id: 'guest-agreement-house-rules',
    name: 'Guest Agreement & House Rules',
    description: 'House rules and booking terms for a guest staying at a Serviced Accommodation property.',
    type: 'document',
    sections: [],
    defaultQuestions: [],
    content: wrap(GUEST_HOUSE_RULES_BODY),
  },
  {
    id: 'sourcing-agreement-r2r-r2sa',
    name: 'Sourcing Agreement (R2R / R2SA)',
    description: 'Agreement between a sourcer and client for rent-to-rent / rent-to-SA opportunities.',
    type: 'document',
    sections: [],
    defaultQuestions: [],
    content: wrap(SOURCING_BODY),
  },
  {
    id: 'sa-management-agreement',
    name: 'Serviced Accommodation Management Agreement',
    description: 'Agreement appointing an SA operator to manage an owner\'s property.',
    type: 'document',
    sections: [],
    defaultQuestions: [],
    content: wrap(MANAGEMENT_BODY),
  },
];