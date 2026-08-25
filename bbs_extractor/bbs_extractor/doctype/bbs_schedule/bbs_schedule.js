// Copyright (c) 2026, one and contributors
// For license information, please see license.txt

frappe.ui.form.on("BBS Schedule", {
	refresh(frm) {
		if (frm.doc.name && !frm.is_new()) {
			frm.add_custom_button(__("Generate Excel"), () => {
				// GET download via the browser (session cookie handles auth) —
				// avoids buffering the binary xlsx through frappe.call/JSON.
				window.open(
					frappe.urllib.get_full_url(
						`/api/method/bbs_extractor.bbs_extractor.doctype.bbs_schedule.bbs_schedule.get_excel?name=${encodeURIComponent(frm.doc.name)}`
					)
				);
			}, __("Export"));

			const items_needing_review = (frm.doc.items || []).filter(
				(i) => i.review && i.review.trim()
			);

			if (items_needing_review.length) {
				frm.add_custom_button(
					__("Draft email"),
					() => draft_clarification_email(frm),
					__("Clarification Email")
				);
				frm.add_custom_button(
					__("Create Email"),
					() => open_plain_composer(frm),
					__("Clarification Email")
				);
			}
		}
	},
});

function draft_clarification_email(frm) {
	frappe.dom.freeze(__("Drafting email…"));
	frappe.call({
		method:
			"bbs_extractor.bbs_extractor.doctype.bbs_schedule.bbs_schedule.draft_clarification_email",
		args: { name: frm.doc.name },
		callback: (r) => {
			frappe.dom.unfreeze();
			if (r.message) {
				open_clarification_composer(frm, r.message);
			}
		},
		error: () => frappe.dom.unfreeze(),
	});
}

function open_plain_composer(frm) {
	// Empty form, but still try to prefill the customer's email if one is
	// on file — only the AI-drafted subject/body are skipped here, not
	// the recipient lookup.
	if (!frm.doc.customer) {
		open_clarification_composer(frm, {});
		return;
	}
	frappe.call({
		method: "bbs_extractor.bbs_extractor.doctype.bbs_schedule.bbs_schedule.get_customer_email",
		args: { customer: frm.doc.customer },
		callback: (r) => {
			open_clarification_composer(frm, { recipients: r.message || "" });
		},
		error: () => open_clarification_composer(frm, {}),
	});
}

function open_clarification_composer(frm, draft) {
	new frappe.views.CommunicationComposer({
		doc: frm.doc,
		subject: draft.subject || `Clarification needed — ${frm.doc.schedule_ref || frm.doc.schedule_name}`,
		recipients: draft.recipients || "",
		message: draft.message || "",
	});
}