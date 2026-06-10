"use client";

import { useState } from "react";
import { useOSStore } from "@/lib/os/store";
import {
  DashboardCard,
  SectionHeader,
  DateInput,
  TextArea,
  FormInput,
  PrimaryButton,
  SecondaryButton,
  IconButton,
  EmptyState,
} from "@/components/os/ui";
import { Trash2 } from "lucide-react";

const emptyForm = {
  weekStartDate: "",
  creationNotes: "",
  contentNotes: "",
  releaseNotes: "",
  growthNotes: "",
  emotionalRealityNotes: "",
  nextWeekReleasePriority: "",
  nextWeekContentPriority: "",
  nextWeekCreationPriority: "",
  nextWeekBrandSkillPriority: "",
};

export default function WeeklyReviewPage() {
  const reviews = useOSStore((s) => s.weeklyReviews);
  const addWeeklyReview = useOSStore((s) => s.addWeeklyReview);
  const deleteWeeklyReview = useOSStore((s) => s.deleteWeeklyReview);

  const [form, setForm] = useState(emptyForm);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.weekStartDate) return;
    addWeeklyReview(form);
    setForm(emptyForm);
  }

  return (
    <div>
      <SectionHeader title="Weekly Review" subtitle="Review the music week without spiralling." />

      <DashboardCard title="New Weekly Review" className="mb-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DateInput
            label="Week starting"
            required
            value={form.weekStartDate}
            onChange={(e) => setForm({ ...form, weekStartDate: e.target.value })}
          />

          <div>
            <h3 className="mb-2 text-sm font-medium text-[#f5f5f5]">Creation</h3>
            <div className="space-y-3">
              <TextArea label="What did I make this week?" value={form.creationNotes} onChange={(e) => setForm({ ...form, creationNotes: e.target.value })} />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-[#f5f5f5]">Content</h3>
            <TextArea label="What did I post? What performed best? What should I repeat or stop?" value={form.contentNotes} onChange={(e) => setForm({ ...form, contentNotes: e.target.value })} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-[#f5f5f5]">Release</h3>
            <TextArea label="What release tasks got done? What is blocking the next release?" value={form.releaseNotes} onChange={(e) => setForm({ ...form, releaseNotes: e.target.value })} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-[#f5f5f5]">Growth</h3>
            <TextArea label="Followers/listeners gained, best platform, best content, most useful learning" value={form.growthNotes} onChange={(e) => setForm({ ...form, growthNotes: e.target.value })} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-[#f5f5f5]">Emotional Reality</h3>
            <TextArea label="What made me spiral? What made me feel proud? What should I make easier next week?" value={form.emotionalRealityNotes} onChange={(e) => setForm({ ...form, emotionalRealityNotes: e.target.value })} />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-[#f5f5f5]">Next Week Priorities (one each)</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormInput label="Release priority" value={form.nextWeekReleasePriority} onChange={(e) => setForm({ ...form, nextWeekReleasePriority: e.target.value })} />
              <FormInput label="Content priority" value={form.nextWeekContentPriority} onChange={(e) => setForm({ ...form, nextWeekContentPriority: e.target.value })} />
              <FormInput label="Creation priority" value={form.nextWeekCreationPriority} onChange={(e) => setForm({ ...form, nextWeekCreationPriority: e.target.value })} />
              <FormInput label="Brand/skill priority" value={form.nextWeekBrandSkillPriority} onChange={(e) => setForm({ ...form, nextWeekBrandSkillPriority: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <SecondaryButton type="button" onClick={() => setForm(emptyForm)}>
              Clear
            </SecondaryButton>
            <PrimaryButton type="submit">Save Review</PrimaryButton>
          </div>
        </form>
      </DashboardCard>

      <h2 className="mb-3 text-sm font-medium text-[#a3a3a3]">Past Reviews</h2>
      {reviews.length === 0 ? (
        <EmptyState title="No weekly reviews yet" subtitle="Complete your first weekly review above." />
      ) : (
        <div className="space-y-4">
          {reviews
            .slice()
            .sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime())
            .map((review) => (
              <DashboardCard key={review.id}>
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold text-[#f5f5f5]">
                    Week of {new Date(review.weekStartDate).toLocaleDateString()}
                  </h3>
                  <IconButton onClick={() => deleteWeeklyReview(review.id)}>
                    <Trash2 size={16} />
                  </IconButton>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  {review.creationNotes && <Field label="Creation" value={review.creationNotes} />}
                  {review.contentNotes && <Field label="Content" value={review.contentNotes} />}
                  {review.releaseNotes && <Field label="Release" value={review.releaseNotes} />}
                  {review.growthNotes && <Field label="Growth" value={review.growthNotes} />}
                  {review.emotionalRealityNotes && <Field label="Emotional Reality" value={review.emotionalRealityNotes} />}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {review.nextWeekReleasePriority && <PriorityBox label="Release" value={review.nextWeekReleasePriority} />}
                  {review.nextWeekContentPriority && <PriorityBox label="Content" value={review.nextWeekContentPriority} />}
                  {review.nextWeekCreationPriority && <PriorityBox label="Creation" value={review.nextWeekCreationPriority} />}
                  {review.nextWeekBrandSkillPriority && <PriorityBox label="Brand/Skill" value={review.nextWeekBrandSkillPriority} />}
                </div>
              </DashboardCard>
            ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#0c0c0c] p-3">
      <div className="text-xs uppercase tracking-wide text-[#a3a3a3]">{label}</div>
      <p className="mt-1 whitespace-pre-wrap text-[#f5f5f5]">{value}</p>
    </div>
  );
}

function PriorityBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#0c0c0c] p-2">
      <div className="text-[10px] uppercase tracking-wide text-cyan-300">{label}</div>
      <div className="mt-0.5 text-xs text-[#f5f5f5]">{value}</div>
    </div>
  );
}
