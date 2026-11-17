import React, { useState, useEffect } from 'react';
import { BarChart2, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../lib/constants';

export default function SurveyPollWidget({ constituency, onOpenCreateModal }) {
  const { user, profile } = useAuth();
  const [surveys, setSurveys] = useState([]);
  const [userVotes, setUserVotes] = useState({}); // { survey_id: selected_option_index }
  const [voteCounts, setVoteCounts] = useState({}); // { survey_id: { option_index: count, total: count } }
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState(null);
  const [error, setError] = useState('');

  const isCitizen = profile?.role === ROLES.CITIZEN;
  const isRepresentative = profile?.role === ROLES.REPRESENTATIVE;

  useEffect(() => {
    let mounted = true;

    async function loadSurveysAndVotes() {
      if (!isSupabaseConfigured) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        // 1. Fetch surveys
        let query = supabase
          .from('surveys')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5);

        if (constituency) {
          query = query.eq('constituency', constituency);
        }

        const { data: surveysData, error: sErr } = await query;
        if (sErr) throw sErr;

        if (!mounted || !surveysData || surveysData.length === 0) {
          if (mounted) {
            setSurveys([]);
            setLoading(false);
          }
          return;
        }

        setSurveys(surveysData);
        const surveyIds = surveysData.map((s) => s.id);

        // 2. Fetch all votes for these surveys to aggregate counts
        const [{ data: countsData, error: countsError }, { data: ownVotes, error: ownError }] = await Promise.all([
          supabase.rpc('get_survey_vote_counts', { p_survey_ids: surveyIds }),
          supabase.from('survey_votes').select('survey_id, selected_option_index').in('survey_id', surveyIds),
        ]);
        if (countsError) throw countsError;
        if (ownError) throw ownError;
        const counts = {};
        (countsData || []).forEach((vote) => {
          if (!counts[vote.survey_id]) counts[vote.survey_id] = { total: 0 };
          counts[vote.survey_id][vote.selected_option_index] = Number(vote.vote_count);
          counts[vote.survey_id].total += Number(vote.vote_count);
        });
        const myVotes = Object.fromEntries((ownVotes || []).map((vote) => [vote.survey_id, vote.selected_option_index]));
        if (mounted) {
          setVoteCounts(counts);
          setUserVotes(myVotes);
        }
      } catch {
        if (mounted) setError('Poll results could not be loaded. Please refresh to try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSurveysAndVotes();
    return () => {
      mounted = false;
    };
  }, [constituency, user]);

  const handleVote = async (surveyId, optionIndex) => {
    if (!isCitizen || !user || userVotes[surveyId] !== undefined) return;

    setVotingId(surveyId);
    try {
      const { error } = await supabase.from('survey_votes').insert([
        {
          survey_id: surveyId,
          citizen_id: user.id,
          selected_option_index: optionIndex,
        },
      ]);

      if (!error) {
        setUserVotes((prev) => ({ ...prev, [surveyId]: optionIndex }));
        setVoteCounts((prev) => {
          const current = prev[surveyId] || { total: 0 };
          return {
            ...prev,
            [surveyId]: {
              ...current,
              [optionIndex]: (current[optionIndex] || 0) + 1,
              total: current.total + 1,
            },
          };
        });
      }
    } catch {
      setError('Your vote could not be saved. Please try again.');
    } finally {
      setVotingId(null);
    }
  };

  if (loading) {
    return <p className="text-xs text-slate-400 py-4">Loading active community polls…</p>;
  }

  if (error) return <p role="alert" className="py-3 text-xs text-rose-700">{error}</p>;

  if (surveys.length === 0) {
    return (
      <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
        <BarChart2 className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="text-xs font-semibold text-slate-700">No Active Polls in {constituency || 'your Area'}</p>
        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
          Elected representatives publish surveys here to gather citizen consensus on local development.
        </p>
        {isRepresentative && onOpenCreateModal && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 cursor-pointer"
          >
            Create First Poll
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {surveys.map((survey) => {
        const counts = voteCounts[survey.id] || { total: 0 };
        const totalVotes = counts.total || 0;
        const votedOptionIndex = userVotes[survey.id];
        const hasVoted = votedOptionIndex !== undefined;
        const isSubmittingThis = votingId === survey.id;

        return (
          <div
            key={survey.id}
            className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  {survey.title}
                </h4>
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                </span>
              </div>
              {survey.description && (
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {survey.description}
                </p>
              )}
            </div>

            {/* Options list */}
            <div className="space-y-2 pt-1">
              {Array.isArray(survey.options) &&
                survey.options.map((option, idx) => {
                  const optionVotes = counts[idx] || 0;
                  const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                  const isSelectedByMe = votedOptionIndex === idx;

                  // If user has voted or is representative/department, show results bar
                  if (hasVoted || isRepresentative) {
                    return (
                      <div
                        key={idx}
                        className={`relative overflow-hidden rounded-xl border p-2.5 transition-all ${
                          isSelectedByMe
                            ? 'border-purple-300 bg-purple-50/50'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        {/* Fill progress bar */}
                        <div
                          className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                            isSelectedByMe ? 'bg-purple-200/50' : 'bg-slate-100'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />

                        <div className="relative flex items-center justify-between text-xs z-10">
                          <span className="font-medium text-slate-800 flex items-center gap-1.5">
                            {isSelectedByMe && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                            {option.text || option}
                          </span>
                          <span className="font-bold text-slate-600 text-[11px]">
                            {percentage}% ({optionVotes})
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // If citizen hasn't voted yet, show selectable radio buttons
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSubmittingThis}
                      onClick={() => handleVote(survey.id, idx)}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/30 transition-all text-xs font-medium text-slate-700 flex items-center justify-between group cursor-pointer disabled:opacity-50"
                    >
                      <span>{option.text || option}</span>
                      <span className="text-[11px] font-semibold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Vote
                      </span>
                    </button>
                  );
                })}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
              <span>Constituency: {survey.constituency}</span>
              {hasVoted ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> You participated
                </span>
              ) : isCitizen ? (
                <span className="text-purple-600 font-medium">Click an option to cast your vote</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
