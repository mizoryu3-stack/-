import { getOrCreateDailySearchSchedule } from "@/lib/schedule/dailySearchSchedule";
import DailySearchScheduleForm from "@/components/DailySearchScheduleForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const schedule = await getOrCreateDailySearchSchedule();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">設定</h1>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">自動探索設定</h2>
          <p className="mt-1 text-sm text-slate-500">
            毎日決まった時刻に、接続済みのデータソースを自動で巡回するスケジュールを設定します。
          </p>
          <p className="mt-1 text-xs text-slate-400">
            ※ここで保存できるのは「いつ実行するか」の設定のみです。実際に指定時刻へ探索を
            自動実行する仕組み（外部スケジューラの接続）は別途必要で、現時点ではまだ接続していません。
          </p>
        </div>

        {/* 保存後もkeyで強制再マウントしない: type="checkbox"/"time"は非制御コンポーネントで、
            保存操作はユーザー自身がその場で入力した値をそのまま保存するだけなので、
            defaultValue/defaultCheckedがマウント時の値のままでも表示は正しいまま食い違わない。
            （逆にkeyで再マウントすると、useActionState()の「保存しました」表示が
            revalidatePath()による再レンダリングと同時に失われてしまうため、あえてしない） */}
        <DailySearchScheduleForm defaultValues={{ enabled: schedule.enabled, time: schedule.time }} />
      </div>
    </div>
  );
}
